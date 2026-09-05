/**
 * Routeurs tRPC pour les messages directs
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
import { getDirectMessagesManager } from './direct-messages-pg';
import { assertConversationMember } from './direct-message-security';
import { db } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';

async function assertMessagesAllowed(recipientId: number) {
  const [recipient] = await db.select({ allowMessages: users.allowMessages }).from(users).where(eq(users.id, recipientId)).limit(1);
  if (!recipient) throw new TRPCError({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
  if (!recipient.allowMessages) throw new TRPCError({ code: 'FORBIDDEN', message: 'Cet utilisateur a désactivé les messages directs.' });
}

export const directMessagesRouter = router({
  getOrCreateConversation: protectedProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
    if (ctx.user.id === input.userId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Impossible de vous envoyer un message.' });
    await assertMessagesAllowed(input.userId);
    const conversationId = await getDirectMessagesManager().getOrCreateConversation(ctx.user.id, input.userId);
    if (!conversationId) return { success: false, error: 'Impossible d’ouvrir la conversation.' };
    return { success: true, conversationId };
  }),

  sendDirectMessage: protectedProcedure.input(z.object({ conversationId: z.number(), recipientId: z.number(), content: z.string(), attachmentUrl: z.string().optional(), attachmentType: z.enum(['image', 'video', 'file']).optional() })).mutation(async ({ ctx, input }) => {
    const conversation = await assertConversationMember(input.conversationId, ctx.user.id);
    const expectedRecipientId = conversation.participant1Id === ctx.user.id ? conversation.participant2Id : conversation.participant1Id;
    if (expectedRecipientId !== input.recipientId) throw new TRPCError({ code: 'BAD_REQUEST', message: 'Destinataire invalide pour cette conversation.' });
    await assertMessagesAllowed(expectedRecipientId);
    const messageId = await getDirectMessagesManager().sendDirectMessage({ ...input, recipientId: expectedRecipientId, senderId: ctx.user.id });
    if (!messageId) return { success: false, error: 'Impossible d’envoyer le message.' };
    return { success: true, messageId };
  }),

  getConversationMessages: protectedProcedure.input(z.object({ conversationId: z.number(), limit: z.number().default(50), offset: z.number().default(0) })).query(async ({ ctx, input }) => {
    await assertConversationMember(input.conversationId, ctx.user.id);
    return getDirectMessagesManager().getConversationMessages(input.conversationId, input.limit, input.offset);
  }),
  getUserConversations: protectedProcedure.input(z.object({ limit: z.number().default(20), offset: z.number().default(0) })).query(({ ctx, input }) => getDirectMessagesManager().getUserConversations(ctx.user.id, input.limit, input.offset)),
  markMessagesAsRead: protectedProcedure.input(z.object({ conversationId: z.number() })).mutation(async ({ ctx, input }) => {
    await assertConversationMember(input.conversationId, ctx.user.id);
    return { success: await getDirectMessagesManager().markMessagesAsRead(input.conversationId, ctx.user.id) };
  }),
  getUnreadMessageCount: protectedProcedure.query(async ({ ctx }) => ({ count: await getDirectMessagesManager().getUnreadMessageCount(ctx.user.id) })),
  deleteMessage: protectedProcedure.input(z.object({ messageId: z.number() })).mutation(async ({ ctx, input }) => ({ success: await getDirectMessagesManager().deleteMessage(input.messageId, ctx.user.id) })),
  editMessage: protectedProcedure.input(z.object({ messageId: z.number(), content: z.string() })).mutation(async ({ ctx, input }) => ({ success: await getDirectMessagesManager().editMessage(input.messageId, ctx.user.id, input.content) })),
  getLastConversationMessage: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ ctx, input }) => {
    await assertConversationMember(input.conversationId, ctx.user.id);
    return getDirectMessagesManager().getLastConversationMessage(input.conversationId);
  }),
  deleteConversation: protectedProcedure.input(z.object({ conversationId: z.number() })).mutation(async ({ ctx, input }) => ({ success: await getDirectMessagesManager().deleteConversation(input.conversationId, ctx.user.id) })),
  searchConversationMessages: protectedProcedure.input(z.object({ conversationId: z.number(), query: z.string(), limit: z.number().default(20) })).query(async ({ ctx, input }) => {
    await assertConversationMember(input.conversationId, ctx.user.id);
    return getDirectMessagesManager().searchConversationMessages(input.conversationId, input.query, input.limit);
  }),
  getConversationStats: protectedProcedure.input(z.object({ conversationId: z.number() })).query(async ({ ctx, input }) => {
    await assertConversationMember(input.conversationId, ctx.user.id);
    return getDirectMessagesManager().getConversationStats(input.conversationId);
  }),
});
