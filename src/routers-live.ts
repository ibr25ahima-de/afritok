/**
 * Routeurs tRPC pour le live streaming
 */

import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getLiveSessionsManager } from './live-sessions';
import { getLiveInvitationsManager } from './live-invitations';
import { getWebRTCSignalingManager } from './webrtc-signaling';
import { getLogger } from './logging';

const logger = getLogger();
const liveSessionsManager = getLiveSessionsManager();
const liveInvitationsManager = getLiveInvitationsManager();
const webrtcSignalingManager = getWebRTCSignalingManager();

export const liveRouter = router({
  /**
   * Créer une nouvelle session live
   */
  createSession: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(500).optional(),
        type: z.enum(['video', 'audio', 'screen-share']).default('video'),
        isPublic: z.boolean().default(true),
        maxParticipants: z.number().int().min(2).max(100).default(50),
      })
    )
    .mutation(({ ctx, input }) => {
      const session = liveSessionsManager.createSession(
        ctx.user.id,
        ctx.user.name || 'Anonymous',
        input.title,
        input.description || '',
        input.type,
        input.isPublic,
        input.maxParticipants
      );

      return {
        sessionId: session.sessionId,
        title: session.title,
        type: session.type,
        state: session.state,
      };
    }),

  /**
   * Obtenir une session live
   */
  getSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        return null;
      }

      return {
        sessionId: session.sessionId,
        hostUsername: session.hostUsername,
        title: session.title,
        description: session.description,
        type: session.type,
        state: session.state,
        participantCount: session.participants.size,
        viewerCount: session.viewerCount,
        maxParticipants: session.maxParticipants,
        isPublic: session.isPublic,
        startedAt: session.startedAt,
      };
    }),

  /**
   * Obtenir la session live actuelle de l'utilisateur
   */
  getCurrentSession: protectedProcedure.query(({ ctx }) => {
    const session = liveSessionsManager.getUserSession(ctx.user.id);
    if (!session) {
      return null;
    }

    return {
      sessionId: session.sessionId,
      title: session.title,
      type: session.type,
      state: session.state,
      participantCount: session.participants.size,
      viewerCount: session.viewerCount,
    };
  }),

  /**
   * Démarrer une session live
   */
  startSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ ctx, input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.hostId !== ctx.user.id) {
        throw new Error('Only the host can start the session');
      }

      liveSessionsManager.setSessionState(input.sessionId, 'live');

      return { success: true };
    }),

  /**
   * Terminer une session live
   */
  endSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ ctx, input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      if (session.hostId !== ctx.user.id) {
        throw new Error('Only the host can end the session');
      }

      liveSessionsManager.closeSession(input.sessionId);

      return { success: true };
    }),

  /**
   * Rejoindre une session live
   */
  joinSession: protectedProcedure
    .input(z.object({ sessionId: z.string(), role: z.enum(['guest', 'viewer']).default('viewer') }))
    .mutation(({ ctx, input }) => {
      const success = liveSessionsManager.addParticipant(
        input.sessionId,
        ctx.user.id,
        ctx.user.name || 'Anonymous',
        input.role
      );

      if (!success) {
        throw new Error('Cannot join session');
      }

      return { success: true };
    }),

  /**
   * Quitter une session live
   */
  leaveSession: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .mutation(({ ctx, input }) => {
      liveSessionsManager.removeParticipant(input.sessionId, ctx.user.id);

      return { success: true };
    }),

  /**
   * Obtenir les participants d'une session
   */
  getParticipants: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        return [];
      }

      return Array.from(session.participants.values()).map((p) => ({
        userId: p.userId,
        username: p.username,
        role: p.role,
        isMuted: p.isMuted,
        isVideoOff: p.isVideoOff,
        joinedAt: p.joinedAt,
      }));
    }),

  /**
   * Mettre à jour le statut audio/vidéo
   */
  updateParticipantStatus: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        isMuted: z.boolean().optional(),
        isVideoOff: z.boolean().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const success = liveSessionsManager.updateParticipantStatus(
        input.sessionId,
        ctx.user.id,
        input.isMuted,
        input.isVideoOff
      );

      if (!success) {
        throw new Error('Cannot update participant status');
      }

      return { success: true };
    }),

  /**
   * Envoyer une invitation live
   */
  sendInvitation: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        toUserId: z.number(),
        toUsername: z.string(),
        message: z.string().optional(),
      })
    )
    .mutation(({ ctx, input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      const invitation = liveInvitationsManager.sendInvitation(
        input.sessionId,
        ctx.user.id,
        ctx.user.name || 'Anonymous',
        input.toUserId,
        input.toUsername,
        input.message
      );

      return {
        invitationId: invitation.invitationId,
        state: invitation.state,
      };
    }),

  /**
   * Obtenir les invitations en attente
   */
  getPendingInvitations: protectedProcedure.query(({ ctx }) => {
    const invitations = liveInvitationsManager.getPendingInvitations(ctx.user.id);

    return invitations.map((inv) => ({
      invitationId: inv.invitationId,
      sessionId: inv.sessionId,
      fromUsername: inv.fromUsername,
      message: inv.message,
      expiresAt: inv.expiresAt,
    }));
  }),

  /**
   * Accepter une invitation
   */
  acceptInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(({ input }) => {
      const success = liveInvitationsManager.acceptInvitation(input.invitationId);

      if (!success) {
        throw new Error('Cannot accept invitation');
      }

      const invitation = liveInvitationsManager.getInvitation(input.invitationId);
      return {
        success: true,
        sessionId: invitation?.sessionId,
      };
    }),

  /**
   * Refuser une invitation
   */
  rejectInvitation: protectedProcedure
    .input(z.object({ invitationId: z.string() }))
    .mutation(({ input }) => {
      const success = liveInvitationsManager.rejectInvitation(input.invitationId);

      if (!success) {
        throw new Error('Cannot reject invitation');
      }

      return { success: true };
    }),

  /**
   * Obtenir les sessions live publiques
   */
  getPublicSessions: protectedProcedure.query(() => {
    const sessions = liveSessionsManager.getPublicSessions();

    return sessions.map((s) => ({
      sessionId: s.sessionId,
      hostUsername: s.hostUsername,
      title: s.title,
      type: s.type,
      participantCount: s.participants.size,
      viewerCount: s.viewerCount,
      maxParticipants: s.maxParticipants,
    }));
  }),

  /**
   * Obtenir les statistiques d'une session
   */
  getSessionStats: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      return liveSessionsManager.getSessionStats(input.sessionId);
    }),

  /**
   * Envoyer un cadeau pendant un live
   */
  sendGiftInLive: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        recipientId: z.number(),
        giftId: z.string(),
        quantity: z.number().int().min(1).default(1),
      })
    )
    .mutation(({ ctx, input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        throw new Error('Session not found');
      }

      // Verifier que le recipient est dans la session
      if (!session.participants.has(input.recipientId)) {
        throw new Error('Recipient not in session');
      }

      logger.info('Gift sent in live', {
        senderId: ctx.user.id,
        recipientId: input.recipientId,
        sessionId: input.sessionId,
        giftId: input.giftId,
        quantity: input.quantity,
      });

      return { success: true };
    }),

  /**
   * Obtenir les cadeaux reçus dans un live
   */
  getLiveGifts: protectedProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(({ input }) => {
      const session = liveSessionsManager.getSession(input.sessionId);
      if (!session) {
        return [];
      }

      return {
        sessionId: input.sessionId,
        giftRevenue: session.giftRevenue,
        hostId: session.hostId,
      };
    }),

  /**
   * Ajouter un revenu de cadeau a une session
   */
  addGiftRevenue: protectedProcedure
    .input(
      z.object({
        sessionId: z.string(),
        amount: z.number().int().min(1),
      })
    )
    .mutation(({ input }) => {
      const success = liveSessionsManager.addGiftRevenue(input.sessionId, input.amount);
      return { success };
    }),
});
