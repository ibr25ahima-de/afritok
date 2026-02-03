/**
 * Routeurs tRPC pour le chat en direct
 */

import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getLiveChatManager } from './live-chat';
import { getLiveSessionsManager } from './live-sessions';

const liveChatManager = getLiveChatManager();
const liveSessionsManager = getLiveSessionsManager();

export const liveChatRouter = router({
  /**
   * Envoyer un message
   */
  sendMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        content: z.string().min(1).max(500),
        type: z.enum(['text', 'emoji', 'gift', 'system']).default('text'),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est dans la session
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const participant = session.participants.get(ctx.user.id);
      if (!participant) {
        throw new Error('User not in session');
      }

      // Vérifier que l'utilisateur n'est pas rendu muet
      if (liveChatManager.isMuted(input.sessionId, ctx.user.id)) {
        throw new Error('You are muted in this chat');
      }

      // Vérifier que l'utilisateur n'est pas banni
      if (liveChatManager.isBanned(input.sessionId, ctx.user.id)) {
        throw new Error('You are banned from this chat');
      }

      const message = liveChatManager.sendMessage(
        input.sessionId,
        ctx.user.id,
        ctx.user.name || 'Anonymous',
        input.content,
        input.type,
        session.hostId === ctx.user.id
      );

      return {
        messageId: message.messageId,
        timestamp: message.timestamp,
      };
    }),

  /**
   * Obtenir les messages
   */
  getMessages: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(({ input }) => {
      const messages = liveChatManager.getMessages(input.sessionId, input.limit);

      return messages.map((m) => ({
        messageId: m.messageId,
        userId: m.userId,
        username: m.username,
        content: m.content,
        type: m.type,
        timestamp: m.timestamp,
        isModerator: m.isModerator,
        isPinned: m.isPinned,
      }));
    }),

  /**
   * Ajouter une réaction
   */
  addReaction: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        emoji: z.string().min(1).max(2),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est dans la session
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const participant = session.participants.get(ctx.user.id);
      if (!participant) {
        throw new Error('User not in session');
      }

      const reaction = liveChatManager.addReaction(
        input.sessionId,
        ctx.user.id,
        ctx.user.name || 'Anonymous',
        input.emoji
      );

      return {
        reactionId: reaction.reactionId,
        timestamp: reaction.timestamp,
      };
    }),

  /**
   * Obtenir les réactions
   */
  getReactions: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(({ input }) => {
      const reactions = liveChatManager.getReactions(input.sessionId, input.limit);

      return reactions.map((r) => ({
        reactionId: r.reactionId,
        userId: r.userId,
        username: r.username,
        emoji: r.emoji,
        timestamp: r.timestamp,
      }));
    }),

  /**
   * Épingler un message (modérateur seulement)
   */
  pinMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can pin messages');
      }

      const success = liveChatManager.pinMessage(input.sessionId, input.messageId);
      if (!success) {
        throw new Error('Cannot pin message');
      }

      return { success: true };
    }),

  /**
   * Dépingler un message (modérateur seulement)
   */
  unpinMessage: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can unpin messages');
      }

      const success = liveChatManager.unpinMessage(input.sessionId, input.messageId);
      if (!success) {
        throw new Error('Cannot unpin message');
      }

      return { success: true };
    }),

  /**
   * Obtenir les messages épinglés
   */
  getPinnedMessages: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const messages = liveChatManager.getPinnedMessages(input.sessionId);

      return messages.map((m) => ({
        messageId: m.messageId,
        userId: m.userId,
        username: m.username,
        content: m.content,
        timestamp: m.timestamp,
      }));
    }),

  /**
   * Rendre muet un utilisateur (modérateur seulement)
   */
  muteUser: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can mute users');
      }

      liveChatManager.muteUser(input.sessionId, input.userId);

      return { success: true };
    }),

  /**
   * Retirer le mute d'un utilisateur (modérateur seulement)
   */
  unmuteUser: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can unmute users');
      }

      liveChatManager.unmuteUser(input.sessionId, input.userId);

      return { success: true };
    }),

  /**
   * Bannir un utilisateur (modérateur seulement)
   */
  banUser: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can ban users');
      }

      liveChatManager.banUser(input.sessionId, input.userId);

      return { success: true };
    }),

  /**
   * Retirer le ban d'un utilisateur (modérateur seulement)
   */
  unbanUser: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        userId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      // Vérifier que l'utilisateur est l'hôte
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session || session.hostId !== ctx.user.id) {
        throw new Error('Only the host can unban users');
      }

      liveChatManager.unbanUser(input.sessionId, input.userId);

      return { success: true };
    }),

  /**
   * Obtenir les statistiques du chat
   */
  getChatStats: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return liveChatManager.getChatStats(input.sessionId);
    }),
});
