import { z } from 'zod';
import { protectedProcedure, router } from './_core/trpc';
import { getLiveSessionsManager } from './live-sessions';
import { getLogger } from './logging';

const logger = getLogger();

export type MessageType = 'text' | 'emoji' | 'gift' | 'system';

export interface ChatMessage {
  messageId: string;
  sessionId: string;
  userId: number;
  username: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  isModerator: boolean;
  isPinned: boolean;
}

export interface ChatReaction {
  reactionId: string;
  sessionId: string;
  userId: number;
  username: string;
  emoji: string;
  timestamp: Date;
}

export class LiveChatManager {
  private messages: Map<string, ChatMessage[]> = new Map();
  private reactions: Map<string, ChatReaction[]> = new Map();
  private pinnedMessages: Map<string, ChatMessage> = new Map();
  private mutedUsers: Map<string, Set<number>> = new Map();
  private bannedUsers: Map<string, Set<number>> = new Map();

  sendMessage(sessionId: string, userId: number, username: string, content: string, type: MessageType = 'text', isModerator: boolean = false): ChatMessage {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const message: ChatMessage = { messageId, sessionId, userId, username, type, content, timestamp: new Date(), isModerator, isPinned: false };
    if (!this.messages.has(sessionId)) this.messages.set(sessionId, []);
    this.messages.get(sessionId)!.push(message);
    logger.info('Chat message sent', { messageId, sessionId, userId, type });
    return message;
  }

  getMessages(sessionId: string, limit = 50) { return (this.messages.get(sessionId) || []).slice(-limit); }
  getRecentMessages(sessionId: string, since: Date, limit = 100) { return (this.messages.get(sessionId) || []).filter(m => m.timestamp > since).slice(-limit); }

  deleteMessage(sessionId: string, messageId: string) {
    const messages = this.messages.get(sessionId); if (!messages) return false;
    const index = messages.findIndex(m => m.messageId === messageId); if (index < 0) return false;
    messages.splice(index, 1); this.pinnedMessages.delete(messageId); return true;
  }

  pinMessage(sessionId: string, messageId: string) {
    const message = (this.messages.get(sessionId) || []).find(m => m.messageId === messageId); if (!message) return false;
    message.isPinned = true; this.pinnedMessages.set(messageId, message); return true;
  }
  unpinMessage(sessionId: string, messageId: string) {
    const message = (this.messages.get(sessionId) || []).find(m => m.messageId === messageId); if (!message) return false;
    message.isPinned = false; this.pinnedMessages.delete(messageId); return true;
  }
  getPinnedMessages(sessionId: string) { return (this.messages.get(sessionId) || []).filter(m => m.isPinned); }

  addReaction(sessionId: string, userId: number, username: string, emoji: string) {
    const reaction: ChatReaction = { reactionId: 'react_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9), sessionId, userId, username, emoji, timestamp: new Date() };
    if (!this.reactions.has(sessionId)) this.reactions.set(sessionId, []);
    this.reactions.get(sessionId)!.push(reaction); return reaction;
  }
  getReactions(sessionId: string, limit = 100) { return (this.reactions.get(sessionId) || []).slice(-limit); }
  getRecentReactions(sessionId: string, since: Date) { return (this.reactions.get(sessionId) || []).filter(r => r.timestamp > since); }

  muteUser(sessionId: string, userId: number) { if (!this.mutedUsers.has(sessionId)) this.mutedUsers.set(sessionId, new Set()); this.mutedUsers.get(sessionId)!.add(userId); return true; }
  unmuteUser(sessionId: string, userId: number) { return this.mutedUsers.get(sessionId)?.delete(userId) || false; }
  isMuted(sessionId: string, userId: number) { return this.mutedUsers.get(sessionId)?.has(userId) || false; }
  banUser(sessionId: string, userId: number) { if (!this.bannedUsers.has(sessionId)) this.bannedUsers.set(sessionId, new Set()); this.bannedUsers.get(sessionId)!.add(userId); const messages = this.messages.get(sessionId); if (messages) this.messages.set(sessionId, messages.filter(m => m.userId !== userId)); return true; }
  unbanUser(sessionId: string, userId: number) { return this.bannedUsers.get(sessionId)?.delete(userId) || false; }
  isBanned(sessionId: string, userId: number) { return this.bannedUsers.get(sessionId)?.has(userId) || false; }
  cleanupOldMessages(sessionId: string, maxAge = 3600000) { const messages = this.messages.get(sessionId); if (!messages) return 0; const cutoff = Date.now() - maxAge; const filtered = messages.filter(m => m.timestamp.getTime() > cutoff); this.messages.set(sessionId, filtered); return messages.length - filtered.length; }
  getChatStats(sessionId: string) { const messages = this.messages.get(sessionId) || []; const reactions = this.reactions.get(sessionId) || []; return { sessionId, totalMessages: messages.length, totalReactions: reactions.length, uniqueUsers: new Set(messages.map(m => m.userId)).size, mutedUsers: (this.mutedUsers.get(sessionId) || new Set()).size, bannedUsers: (this.bannedUsers.get(sessionId) || new Set()).size, pinnedMessages: messages.filter(m => m.isPinned).length }; }
}

let instance: LiveChatManager | null = null;
export function getLiveChatManager(): LiveChatManager { if (!instance) instance = new LiveChatManager(); return instance; }

// Compatibility export: routers.ts historically imported liveChatRouter from this module.
// The full live-chat implementation remains available through getLiveChatManager().
const liveChatManager = getLiveChatManager();
const liveSessionsManager = getLiveSessionsManager();

export const liveChatRouter = router({
  sendMessage: protectedProcedure.input(z.object({ sessionId: z.string(), content: z.string().min(1).max(500), type: z.enum(['text', 'emoji', 'gift', 'system']).default('text') })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session) throw new Error('Session not found');
    if (!session.participants.get(ctx.user.id)) throw new Error('User not in session');
    if (liveChatManager.isMuted(input.sessionId, ctx.user.id)) throw new Error('You are muted in this chat');
    if (liveChatManager.isBanned(input.sessionId, ctx.user.id)) throw new Error('You are banned from this chat');
    const message = liveChatManager.sendMessage(input.sessionId, ctx.user.id, ctx.user.name || 'Anonymous', input.content, input.type, session.hostId === ctx.user.id);
    return { messageId: message.messageId, timestamp: message.timestamp };
  }),
  getMessages: protectedProcedure.input(z.object({ sessionId: z.string(), limit: z.number().int().min(1).max(100).default(50) })).query(({ input }) => liveChatManager.getMessages(input.sessionId, input.limit)),
  addReaction: protectedProcedure.input(z.object({ sessionId: z.string(), emoji: z.string().min(1).max(2) })).mutation(({ ctx, input }) => {
    const session = liveSessionsManager.getSession(input.sessionId);
    if (!session || !session.participants.get(ctx.user.id)) throw new Error('User not in session');
    const reaction = liveChatManager.addReaction(input.sessionId, ctx.user.id, ctx.user.name || 'Anonymous', input.emoji);
    return { reactionId: reaction.reactionId, timestamp: reaction.timestamp };
  }),
  getReactions: protectedProcedure.input(z.object({ sessionId: z.string(), limit: z.number().int().min(1).max(100).default(50) })).query(({ input }) => liveChatManager.getReactions(input.sessionId, input.limit)),
});
