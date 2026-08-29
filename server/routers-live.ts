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
  createSession: protectedProcedure.input(z.object({ title: z.string().min(1).max(200), description: z.string().max(500).optional(), type: z.enum(['video', 'audio', 'screen-share']).default('video'), isPublic: z.boolean().default(true), maxParticipants: z.number().int().min(2).max(100).default(50) })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.createSession(ctx.user.id, ctx.user.name || 'Anonymous', input.title, input.description || '', input.type, input.isPublic, input.maxParticipants);
    return { sessionId: session.sessionId, title: session.title, type: session.type, state: session.state };
  }),

  getSession: protectedProcedure.input(z.object({ sessionId: z.string() })).query(({ input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) return null;
    return {
      sessionId: session.sessionId,
      hostId: session.hostId,
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

  getCurrentSession: protectedProcedure.query(({ ctx }) => {
    const session = liveSessionsManager.getUserSession(ctx.user.id);
    if (!session) return null;
    return { sessionId: session.sessionId, title: session.title, type: session.type, state: session.state, participantCount: session.participants.size, viewerCount: session.viewerCount };
  }),

  startSession: protectedProcedure.input(z.object({ sessionId: z.string() })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');
    if (session.hostId !== ctx.user.id) throw new Error('Only the host can start the session');
    liveSessionsManager.setSessionState(input.sessionId, 'live');
    return { success: true };
  }),

  endSession: protectedProcedure.input(z.object({ sessionId: z.string() })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');
    if (session.hostId !== ctx.user.id) throw new Error('Only the host can end the session');
    liveSessionsManager.closeSession(input.sessionId);
    return { success: true };
  }),

  joinSession: protectedProcedure.input(z.object({ sessionId: z.string(), role: z.enum(['guest', 'viewer']).default('viewer') })).mutation(({ ctx, input }) => {
    const success = liveSessionsManager.addParticipant(input.sessionId, ctx.user.id, ctx.user.name || 'Anonymous', input.role);
    if (!success) throw new Error('Cannot join session');
    return { success: true };
  }),

  leaveSession: protectedProcedure.input(z.object({ sessionId: z.string() })).mutation(({ ctx, input }) => {
    liveSessionsManager.removeParticipant(input.sessionId, ctx.user.id);
    return { success: true };
  }),

  getParticipants: protectedProcedure.input(z.object({ sessionId: z.string() })).query(({ input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) return [];
    return Array.from(session.participants.values()).map((p) => ({ userId: p.userId, username: p.username, role: p.role, isMuted: p.isMuted, isVideoOff: p.isVideoOff, joinedAt: p.joinedAt }));
  }),

  updateParticipantStatus: protectedProcedure.input(z.object({ sessionId: z.string(), isMuted: z.boolean().optional(), isVideoOff: z.boolean().optional() })).mutation(({ ctx, input }) => {
    const success = liveSessionsManager.updateParticipantStatus(input.sessionId, ctx.user.id, input.isMuted, input.isVideoOff);
    if (!success) throw new Error('Cannot update participant status');
    return { success: true };
  }),

  sendInvitation: protectedProcedure.input(z.object({ sessionId: z.string(), toUserId: z.number(), toUsername: z.string(), message: z.string().optional() })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');
    const invitation = liveInvitationsManager.sendInvitation(input.sessionId, ctx.user.id, ctx.user.name || 'Anonymous', input.toUserId, input.toUsername, input.message);
    return { invitationId: invitation.invitationId, state: invitation.state };
  }),

  getPendingInvitations: protectedProcedure.query(({ ctx }) => liveInvitationsManager.getPendingInvitations(ctx.user.id).map((inv) => ({ invitationId: inv.invitationId, sessionId: inv.sessionId, fromUsername: inv.fromUsername, message: inv.message, expiresAt: inv.expiresAt }))),
  acceptInvitation: protectedProcedure.input(z.object({ invitationId: z.string() })).mutation(({ input }) => { const success = liveInvitationsManager.acceptInvitation(input.invitationId); if (!success) throw new Error('Cannot accept invitation'); const invitation = liveInvitationsManager.getInvitation(input.invitationId); return { success: true, sessionId: invitation?.sessionId }; }),
  rejectInvitation: protectedProcedure.input(z.object({ invitationId: z.string() })).mutation(({ input }) => { const success = liveInvitationsManager.rejectInvitation(input.invitationId); if (!success) throw new Error('Cannot reject invitation'); return { success: true }; }),

  getPublicSessions: protectedProcedure.query(() => liveSessionsManager.getPublicSessions().map((s) => ({ sessionId: s.sessionId, hostId: s.hostId, hostUsername: s.hostUsername, title: s.title, type: s.type, participantCount: s.participants.size, viewerCount: s.viewerCount, maxParticipants: s.maxParticipants }))),
  getSessionStats: protectedProcedure.input(z.object({ sessionId: z.string() })).query(({ input }) => liveSessionsManager.getSessionStats(input.sessionId)),

  sendGiftInLive: protectedProcedure.input(z.object({ sessionId: z.string(), recipientId: z.number(), giftId: z.string(), quantity: z.number().int().min(1).default(1) })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');
    if (!session.participants.has(input.recipientId)) throw new Error('Recipient not in session');
    logger.info('Gift sent in live', { senderId: ctx.user.id, recipientId: input.recipientId, sessionId: input.sessionId, giftId: input.giftId, quantity: input.quantity });
    return { success: true };
  }),

  getLiveGifts: protectedProcedure.input(z.object({ sessionId: z.string() })).query(({ input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) return [];
    return { sessionId: input.sessionId, giftRevenue: session.giftRevenue, hostId: session.hostId };
  }),

  addGiftRevenue: protectedProcedure.input(z.object({ sessionId: z.string(), amount: z.number().int().min(1) })).mutation(({ input }) => ({ success: liveSessionsManager.addGiftRevenue(input.sessionId, input.amount) })),
});
