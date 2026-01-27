/**
 * Routeurs tRPC pour WebSocket et communication temps réel
 * 
 * À intégrer dans server/routers.ts
 */

import { router, publicProcedure, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getWebSocketManager } from './websocket';

export const websocketRouter = router({
  /**
   * Obtenir l'état de connexion WebSocket
   */
  getConnectionStatus: protectedProcedure.query(({ ctx }) => {
    const wsManager = getWebSocketManager();
    return {
      isConnected: wsManager.isUserOnline(ctx.user.id),
      connectedUsers: wsManager.getConnectedUsersCount(),
      userId: ctx.user.id,
    };
  }),

  /**
   * Envoyer un événement de like vidéo
   */
  sendVideoLike: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        creatorId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.creatorId, 'video:liked', {
        videoId: input.videoId,
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
      });
      return { success: true };
    }),

  /**
   * Envoyer un événement de commentaire
   */
  sendCommentNotification: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        creatorId: z.number(),
        commentContent: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.creatorId, 'comment:added', {
        videoId: input.videoId,
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
        content: input.commentContent,
      });
      return { success: true };
    }),

  /**
   * Envoyer un événement de suivi
   */
  sendFollowNotification: protectedProcedure
    .input(
      z.object({
        followingId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.followingId, 'user:followed', {
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
      });
      return { success: true };
    }),

  /**
   * Envoyer un message direct
   */
  sendDirectMessage: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        content: z.string(),
        messageId: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.recipientId, 'message:sent' as any, {
        senderId: ctx.user.id,
        senderName: ctx.user.name || 'Unknown',
        content: input.content,
        messageId: input.messageId,
        sentAt: new Date(),
      });
      return { success: true };
    }),

  /**
   * Notifier que l'utilisateur tape un message
   */
  sendTypingIndicator: protectedProcedure
    .input(
      z.object({
        conversationId: z.string(),
        isTyping: z.boolean(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      const eventType = input.isTyping ? 'typing:start' : 'typing:stop';
      wsManager.sendToRoom(input.conversationId, eventType as any, {
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
      });
      return { success: true };
    }),

  /**
   * Envoyer un cadeau virtuel
   */
  sendVirtualGift: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        videoId: z.number(),
        giftId: z.number(),
        giftName: z.string(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.recipientId, 'gift:received' as any, {
        senderId: ctx.user.id,
        senderName: ctx.user.name || 'Unknown',
        giftName: input.giftName,
        videoId: input.videoId,
        sentAt: new Date(),
      });
      return { success: true };
    }),

  /**
   * Notifier un duet créé
   */
  notifyDuetCreated: protectedProcedure
    .input(
      z.object({
        originalCreatorId: z.number(),
        originalVideoId: z.number(),
        duetVideoId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.originalCreatorId, 'duet:created' as any, {
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
        originalVideoId: input.originalVideoId,
        duetVideoId: input.duetVideoId,
        createdAt: new Date(),
      });
      return { success: true };
    }),

  /**
   * Notifier un stitch créé
   */
  notifyStitchCreated: protectedProcedure
    .input(
      z.object({
        originalCreatorId: z.number(),
        originalVideoId: z.number(),
        stitchVideoId: z.number(),
      })
    )
    .mutation(({ ctx, input }) => {
      const wsManager = getWebSocketManager();
      wsManager.sendToUser(input.originalCreatorId, 'stitch:created' as any, {
        userId: ctx.user.id,
        userName: ctx.user.name || 'Unknown',
        originalVideoId: input.originalVideoId,
        stitchVideoId: input.stitchVideoId,
        createdAt: new Date(),
      });
      return { success: true };
    }),

  /**
   * Obtenir les utilisateurs connectés
   */
  getConnectedUsers: publicProcedure.query(() => {
    const wsManager = getWebSocketManager();
    return {
      count: wsManager.getConnectedUsersCount(),
      userIds: wsManager.getConnectedUsers(),
    };
  }),

  /**
   * Vérifier si un utilisateur est en ligne
   */
  isUserOnline: publicProcedure
    .input(z.object({ userId: z.number() }))
    .query(({ input }) => {
      const wsManager = getWebSocketManager();
      return {
        userId: input.userId,
        isOnline: wsManager.isUserOnline(input.userId),
      };
    }),
});
