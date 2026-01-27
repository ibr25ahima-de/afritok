/**
 * Routeurs tRPC pour les messages directs
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDirectMessagesManager } from './direct-messages';

export const directMessagesRouter = router({
  /**
   * Obtenir ou créer une conversation
   */
  getOrCreateConversation: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      const conversationId = await manager.getOrCreateConversation(ctx.user.id, input.userId);

      if (!conversationId) {
        return { success: false, error: 'Failed to create conversation' };
      }

      return { success: true, conversationId };
    }),

  /**
   * Envoyer un message direct
   */
  sendDirectMessage: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        recipientId: z.number(),
        content: z.string(),
        attachmentUrl: z.string().optional(),
        attachmentType: z.enum(['image', 'video', 'file']).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();

      const messageId = await manager.sendDirectMessage({
        conversationId: input.conversationId,
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        content: input.content,
        attachmentUrl: input.attachmentUrl,
        attachmentType: input.attachmentType,
      });

      if (!messageId) {
        return { success: false, error: 'Failed to send message' };
      }

      // TODO: Notifier en temps réel via WebSocket

      return { success: true, messageId };
    }),

  /**
   * Obtenir les messages d'une conversation
   */
  getConversationMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        limit: z.number().default(50),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const manager = getDirectMessagesManager();
      return await manager.getConversationMessages(input.conversationId, input.limit, input.offset);
    }),

  /**
   * Obtenir les conversations d'un utilisateur
   */
  getUserConversations: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      return await manager.getUserConversations(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Marquer les messages comme lus
   */
  markMessagesAsRead: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      const success = await manager.markMessagesAsRead(input.conversationId, ctx.user.id);
      return { success };
    }),

  /**
   * Obtenir le nombre de messages non lus
   */
  getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => {
    const manager = getDirectMessagesManager();
    const count = await manager.getUnreadMessageCount(ctx.user.id);
    return { count };
  }),

  /**
   * Supprimer un message
   */
  deleteMessage: protectedProcedure
    .input(z.object({ messageId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      const success = await manager.deleteMessage(input.messageId, ctx.user.id);
      return { success };
    }),

  /**
   * Éditer un message
   */
  editMessage: protectedProcedure
    .input(
      z.object({
        messageId: z.number(),
        content: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      const success = await manager.editMessage(input.messageId, ctx.user.id, input.content);
      return { success };
    }),

  /**
   * Obtenir le dernier message d'une conversation
   */
  getLastConversationMessage: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const manager = getDirectMessagesManager();
      return await manager.getLastConversationMessage(input.conversationId);
    }),

  /**
   * Supprimer une conversation
   */
  deleteConversation: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getDirectMessagesManager();
      const success = await manager.deleteConversation(input.conversationId, ctx.user.id);
      return { success };
    }),

  /**
   * Rechercher des messages dans une conversation
   */
  searchConversationMessages: protectedProcedure
    .input(
      z.object({
        conversationId: z.number(),
        query: z.string(),
        limit: z.number().default(20),
      })
    )
    .query(async ({ input }) => {
      const manager = getDirectMessagesManager();
      return await manager.searchConversationMessages(input.conversationId, input.query, input.limit);
    }),

  /**
   * Obtenir les statistiques de conversation
   */
  getConversationStats: protectedProcedure
    .input(z.object({ conversationId: z.number() }))
    .query(async ({ input }) => {
      const manager = getDirectMessagesManager();
      return await manager.getConversationStats(input.conversationId);
    }),
});
