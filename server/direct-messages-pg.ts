import { sql } from "drizzle-orm";
import { db } from "./db";

let ready: Promise<void> | null = null;

async function ensureTables() {
  if (!ready) {
    ready = (async () => {
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "conversations" (
        "id" SERIAL PRIMARY KEY,
        "participant1Id" INTEGER NOT NULL,
        "participant2Id" INTEGER NOT NULL,
        "lastMessageAt" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        UNIQUE ("participant1Id", "participant2Id")
      )`);
      await db.execute(sql`CREATE TABLE IF NOT EXISTS "directMessages" (
        "id" SERIAL PRIMARY KEY,
        "conversationId" INTEGER NOT NULL,
        "senderId" INTEGER NOT NULL,
        "content" TEXT NOT NULL,
        "mediaUrl" VARCHAR(500),
        "mediaType" VARCHAR(20) NOT NULL DEFAULT 'none',
        "isRead" BOOLEAN NOT NULL DEFAULT FALSE,
        "readAt" TIMESTAMP,
        "isEdited" BOOLEAN NOT NULL DEFAULT FALSE,
        "editedAt" TIMESTAMP,
        "sentAt" TIMESTAMP NOT NULL DEFAULT NOW()
      )`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "directMessages_conversation_idx" ON "directMessages" ("conversationId")`);
      await db.execute(sql`CREATE INDEX IF NOT EXISTS "directMessages_sender_idx" ON "directMessages" ("senderId")`);
    })().catch((error) => {
      ready = null;
      throw error;
    });
  }
  await ready;
}

export interface DirectMessageData {
  conversationId: number;
  senderId: number;
  recipientId: number;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string;
}

export class DirectMessagesManager {
  async getOrCreateConversation(userId1: number, userId2: number): Promise<number | null> {
    try {
      await ensureTables();
      const [a, b] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];
      const existing = await db.execute(sql`SELECT "id" FROM "conversations" WHERE "participant1Id" = ${a} AND "participant2Id" = ${b} LIMIT 1`);
      const rows = (existing as any).rows || [];
      if (rows.length) return Number(rows[0].id);
      const created = await db.execute(sql`INSERT INTO "conversations" ("participant1Id", "participant2Id") VALUES (${a}, ${b}) ON CONFLICT ("participant1Id", "participant2Id") DO UPDATE SET "updatedAt" = NOW() RETURNING "id"`);
      const createdRows = (created as any).rows || [];
      return createdRows.length ? Number(createdRows[0].id) : null;
    } catch (error) {
      console.error("[DirectMessages] create conversation failed", error);
      return null;
    }
  }

  async sendDirectMessage(data: DirectMessageData): Promise<number | null> {
    try {
      await ensureTables();
      if (!data.content?.trim() || data.content.length > 5000) return null;
      const result = await db.execute(sql`INSERT INTO "directMessages" ("conversationId", "senderId", "content", "mediaUrl", "mediaType") VALUES (${data.conversationId}, ${data.senderId}, ${data.content.trim()}, ${data.attachmentUrl || null}, ${data.attachmentType || "none"}) RETURNING "id"`);
      await db.execute(sql`UPDATE "conversations" SET "lastMessageAt" = NOW(), "updatedAt" = NOW() WHERE "id" = ${data.conversationId}`);
      const rows = (result as any).rows || [];
      return rows.length ? Number(rows[0].id) : null;
    } catch (error) {
      console.error("[DirectMessages] send failed", error);
      return null;
    }
  }

  async getConversationMessages(conversationId: number, limit = 50, offset = 0): Promise<any[]> {
    try {
      await ensureTables();
      const result = await db.execute(sql`SELECT * FROM "directMessages" WHERE "conversationId" = ${conversationId} ORDER BY "sentAt" ASC LIMIT ${Math.min(limit, 100)} OFFSET ${Math.max(offset, 0)}`);
      return (result as any).rows || [];
    } catch (error) {
      console.error("[DirectMessages] get messages failed", error);
      return [];
    }
  }

  async getUserConversations(userId: number, limit = 20, offset = 0): Promise<any[]> {
    try {
      await ensureTables();
      const result = await db.execute(sql`SELECT * FROM "conversations" WHERE "participant1Id" = ${userId} OR "participant2Id" = ${userId} ORDER BY "updatedAt" DESC LIMIT ${Math.min(limit, 100)} OFFSET ${Math.max(offset, 0)}`);
      return (result as any).rows || [];
    } catch (error) {
      console.error("[DirectMessages] get conversations failed", error);
      return [];
    }
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    try {
      await ensureTables();
      await db.execute(sql`UPDATE "directMessages" SET "isRead" = TRUE, "readAt" = NOW() WHERE "conversationId" = ${conversationId} AND "senderId" <> ${userId}`);
      return true;
    } catch { return false; }
  }

  async getUnreadMessageCount(userId: number): Promise<number> {
    try {
      await ensureTables();
      const result = await db.execute(sql`SELECT COUNT(*)::int AS count FROM "directMessages" m JOIN "conversations" c ON c."id" = m."conversationId" WHERE m."isRead" = FALSE AND m."senderId" <> ${userId} AND (c."participant1Id" = ${userId} OR c."participant2Id" = ${userId})`);
      return Number(((result as any).rows || [])[0]?.count || 0);
    } catch { return 0; }
  }

  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    try {
      await ensureTables();
      const result = await db.execute(sql`DELETE FROM "directMessages" WHERE "id" = ${messageId} AND "senderId" = ${userId}`);
      return Number((result as any).rowCount || 0) > 0;
    } catch { return false; }
  }

  async editMessage(messageId: number, userId: number, content: string): Promise<boolean> {
    try {
      await ensureTables();
      if (!content?.trim() || content.length > 5000) return false;
      const result = await db.execute(sql`UPDATE "directMessages" SET "content" = ${content.trim()}, "isEdited" = TRUE, "editedAt" = NOW() WHERE "id" = ${messageId} AND "senderId" = ${userId}`);
      return Number((result as any).rowCount || 0) > 0;
    } catch { return false; }
  }

  async getLastConversationMessage(conversationId: number): Promise<any | null> {
    const messages = await this.getConversationMessages(conversationId, 1, 0);
    return messages.length ? messages[messages.length - 1] : null;
  }

  async deleteConversation(conversationId: number, userId: number): Promise<boolean> {
    try {
      await ensureTables();
      const check = await db.execute(sql`SELECT "id" FROM "conversations" WHERE "id" = ${conversationId} AND ("participant1Id" = ${userId} OR "participant2Id" = ${userId}) LIMIT 1`);
      if (!(check as any).rows?.length) return false;
      await db.execute(sql`DELETE FROM "directMessages" WHERE "conversationId" = ${conversationId}`);
      await db.execute(sql`DELETE FROM "conversations" WHERE "id" = ${conversationId}`);
      return true;
    } catch { return false; }
  }

  async searchConversationMessages(conversationId: number, query: string, limit = 20): Promise<any[]> {
    try {
      await ensureTables();
      const result = await db.execute(sql`SELECT * FROM "directMessages" WHERE "conversationId" = ${conversationId} AND "content" ILIKE ${"%" + query + "%"} ORDER BY "sentAt" DESC LIMIT ${Math.min(limit, 100)}`);
      return (result as any).rows || [];
    } catch { return []; }
  }

  async getConversationStats(conversationId: number) {
    const messages = await this.getConversationMessages(conversationId, 1000, 0);
    const last = messages[messages.length - 1];
    return { messageCount: messages.length, unreadCount: messages.filter((m) => !m.isRead).length, lastMessageTime: last?.sentAt };
  }
}

let manager: DirectMessagesManager | null = null;
export function getDirectMessagesManager() {
  if (!manager) manager = new DirectMessagesManager();
  return manager;
}
