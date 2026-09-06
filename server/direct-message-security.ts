import { TRPCError } from '@trpc/server';
import { ensureDirectMessageTables } from './direct-messages-pg';
import { db } from './db';
import { sql } from 'drizzle-orm';

export type ConversationParticipants = {
  id: number;
  participant1Id: number;
  participant2Id: number;
};

export async function getConversationParticipants(conversationId: number): Promise<ConversationParticipants | null> {
  await ensureDirectMessageTables();
  const result = await db.execute(sql`
    SELECT "id", "participant1Id", "participant2Id"
    FROM "conversations"
    WHERE "id" = ${conversationId}
    LIMIT 1
  `);
  const row = ((result as any).rows || [])[0];
  if (!row) return null;
  return {
    id: Number(row.id),
    participant1Id: Number(row.participant1Id),
    participant2Id: Number(row.participant2Id),
  };
}

export async function assertConversationMember(conversationId: number, userId: number): Promise<ConversationParticipants> {
  const conversation = await getConversationParticipants(conversationId);
  if (!conversation) throw new TRPCError({ code: 'NOT_FOUND', message: 'Conversation introuvable.' });
  if (conversation.participant1Id !== userId && conversation.participant2Id !== userId) {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Accès à cette conversation refusé.' });
  }
  return conversation;
}
