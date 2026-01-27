/**
 * Module de gestion du chat en direct pour les sessions live
 * 
 * Gère :
 * - Messages en direct
 * - Réactions (emojis)
 * - Modération du chat
 * - Historique des messages
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Types de messages
 */
export type MessageType = 'text' | 'emoji' | 'gift' | 'system';

/**
 * Interface pour un message de chat
 */
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

/**
 * Interface pour une réaction
 */
export interface ChatReaction {
  reactionId: string;
  sessionId: string;
  userId: number;
  username: string;
  emoji: string;
  timestamp: Date;
}

/**
 * Classe pour gérer le chat en direct
 */
export class LiveChatManager {
  private messages: Map<string, ChatMessage[]> = new Map(); // sessionId -> messages
  private reactions: Map<string, ChatReaction[]> = new Map(); // sessionId -> reactions
  private pinnedMessages: Map<string, ChatMessage> = new Map(); // messageId -> message
  private mutedUsers: Map<string, Set<number>> = new Map(); // sessionId -> userIds
  private bannedUsers: Map<string, Set<number>> = new Map(); // sessionId -> userIds

  /**
   * Envoyer un message
   */
  sendMessage(
    sessionId: string,
    userId: number,
    username: string,
    content: string,
    type: MessageType = 'text',
    isModerator: boolean = false
  ): ChatMessage {
    const messageId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const message: ChatMessage = {
      messageId,
      sessionId,
      userId,
      username,
      type,
      content,
      timestamp: new Date(),
      isModerator,
      isPinned: false,
    };

    if (!this.messages.has(sessionId)) {
      this.messages.set(sessionId, []);
    }

    this.messages.get(sessionId)!.push(message);

    logger.info('Chat message sent', {
      messageId,
      sessionId,
      userId,
      type,
    });

    return message;
  }

  /**
   * Obtenir les messages d'une session
   */
  getMessages(sessionId: string, limit: number = 50): ChatMessage[] {
    const sessionMessages = this.messages.get(sessionId) || [];
    return sessionMessages.slice(-limit);
  }

  /**
   * Obtenir les messages récents
   */
  getRecentMessages(sessionId: string, since: Date, limit: number = 100): ChatMessage[] {
    const sessionMessages = this.messages.get(sessionId) || [];
    return sessionMessages
      .filter((m) => m.timestamp > since)
      .slice(-limit);
  }

  /**
   * Supprimer un message
   */
  deleteMessage(sessionId: string, messageId: string): boolean {
    const sessionMessages = this.messages.get(sessionId);
    if (!sessionMessages) {
      return false;
    }

    const index = sessionMessages.findIndex((m) => m.messageId === messageId);
    if (index === -1) {
      return false;
    }

    sessionMessages.splice(index, 1);
    this.pinnedMessages.delete(messageId);

    logger.info('Message deleted', { messageId, sessionId });

    return true;
  }

  /**
   * Épingler un message
   */
  pinMessage(sessionId: string, messageId: string): boolean {
    const sessionMessages = this.messages.get(sessionId);
    if (!sessionMessages) {
      return false;
    }

    const message = sessionMessages.find((m) => m.messageId === messageId);
    if (!message) {
      return false;
    }

    message.isPinned = true;
    this.pinnedMessages.set(messageId, message);

    logger.info('Message pinned', { messageId, sessionId });

    return true;
  }

  /**
   * Dépingler un message
   */
  unpinMessage(sessionId: string, messageId: string): boolean {
    const sessionMessages = this.messages.get(sessionId);
    if (!sessionMessages) {
      return false;
    }

    const message = sessionMessages.find((m) => m.messageId === messageId);
    if (!message) {
      return false;
    }

    message.isPinned = false;
    this.pinnedMessages.delete(messageId);

    logger.info('Message unpinned', { messageId, sessionId });

    return true;
  }

  /**
   * Obtenir les messages épinglés
   */
  getPinnedMessages(sessionId: string): ChatMessage[] {
    const sessionMessages = this.messages.get(sessionId) || [];
    return sessionMessages.filter((m) => m.isPinned);
  }

  /**
   * Ajouter une réaction
   */
  addReaction(
    sessionId: string,
    userId: number,
    username: string,
    emoji: string
  ): ChatReaction {
    const reactionId = 'react_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const reaction: ChatReaction = {
      reactionId,
      sessionId,
      userId,
      username,
      emoji,
      timestamp: new Date(),
    };

    if (!this.reactions.has(sessionId)) {
      this.reactions.set(sessionId, []);
    }

    this.reactions.get(sessionId)!.push(reaction);

    logger.info('Reaction added', {
      reactionId,
      sessionId,
      userId,
      emoji,
    });

    return reaction;
  }

  /**
   * Obtenir les réactions d'une session
   */
  getReactions(sessionId: string, limit: number = 100): ChatReaction[] {
    const sessionReactions = this.reactions.get(sessionId) || [];
    return sessionReactions.slice(-limit);
  }

  /**
   * Obtenir les réactions récentes
   */
  getRecentReactions(sessionId: string, since: Date): ChatReaction[] {
    const sessionReactions = this.reactions.get(sessionId) || [];
    return sessionReactions.filter((r) => r.timestamp > since);
  }

  /**
   * Rendre muet un utilisateur
   */
  muteUser(sessionId: string, userId: number): boolean {
    if (!this.mutedUsers.has(sessionId)) {
      this.mutedUsers.set(sessionId, new Set());
    }

    this.mutedUsers.get(sessionId)!.add(userId);

    logger.info('User muted', { sessionId, userId });

    return true;
  }

  /**
   * Retirer le mute d'un utilisateur
   */
  unmuteUser(sessionId: string, userId: number): boolean {
    const mutedSet = this.mutedUsers.get(sessionId);
    if (!mutedSet) {
      return false;
    }

    const removed = mutedSet.delete(userId);

    if (removed) {
      logger.info('User unmuted', { sessionId, userId });
    }

    return removed;
  }

  /**
   * Vérifier si un utilisateur est rendu muet
   */
  isMuted(sessionId: string, userId: number): boolean {
    const mutedSet = this.mutedUsers.get(sessionId);
    return mutedSet ? mutedSet.has(userId) : false;
  }

  /**
   * Bannir un utilisateur
   */
  banUser(sessionId: string, userId: number): boolean {
    if (!this.bannedUsers.has(sessionId)) {
      this.bannedUsers.set(sessionId, new Set());
    }

    this.bannedUsers.get(sessionId)!.add(userId);

    // Supprimer les messages de l'utilisateur
    const sessionMessages = this.messages.get(sessionId);
    if (sessionMessages) {
      const filtered = sessionMessages.filter((m) => m.userId !== userId);
      this.messages.set(sessionId, filtered);
    }

    logger.info('User banned', { sessionId, userId });

    return true;
  }

  /**
   * Retirer le ban d'un utilisateur
   */
  unbanUser(sessionId: string, userId: number): boolean {
    const bannedSet = this.bannedUsers.get(sessionId);
    if (!bannedSet) {
      return false;
    }

    const removed = bannedSet.delete(userId);

    if (removed) {
      logger.info('User unbanned', { sessionId, userId });
    }

    return removed;
  }

  /**
   * Vérifier si un utilisateur est banni
   */
  isBanned(sessionId: string, userId: number): boolean {
    const bannedSet = this.bannedUsers.get(sessionId);
    return bannedSet ? bannedSet.has(userId) : false;
  }

  /**
   * Nettoyer les messages anciens
   */
  cleanupOldMessages(sessionId: string, maxAge: number = 3600000): number {
    // Par défaut, garder les messages des 60 dernières minutes
    const sessionMessages = this.messages.get(sessionId);
    if (!sessionMessages) {
      return 0;
    }

    const cutoffTime = Date.now() - maxAge;
    const filtered = sessionMessages.filter((m) => m.timestamp.getTime() > cutoffTime);

    const removed = sessionMessages.length - filtered.length;
    this.messages.set(sessionId, filtered);

    if (removed > 0) {
      logger.info('Old messages cleaned up', { sessionId, removed });
    }

    return removed;
  }

  /**
   * Obtenir les statistiques du chat
   */
  getChatStats(sessionId: string) {
    const messages = this.messages.get(sessionId) || [];
    const reactions = this.reactions.get(sessionId) || [];
    const mutedUsers = this.mutedUsers.get(sessionId) || new Set();
    const bannedUsers = this.bannedUsers.get(sessionId) || new Set();

    const uniqueUsers = new Set(messages.map((m) => m.userId));

    return {
      sessionId,
      totalMessages: messages.length,
      totalReactions: reactions.length,
      uniqueUsers: uniqueUsers.size,
      mutedUsers: mutedUsers.size,
      bannedUsers: bannedUsers.size,
      pinnedMessages: Array.from(this.pinnedMessages.values()).filter(
        (m) => m.sessionId === sessionId
      ).length,
    };
  }
}

// Singleton
let instance: LiveChatManager | null = null;

export function getLiveChatManager(): LiveChatManager {
  if (!instance) {
    instance = new LiveChatManager();
  }
  return instance;
}
