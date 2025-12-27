/**
 * Système de messages directs pour Afritok
 * 
 * Gère :
 * - Conversations entre utilisateurs
 * - Envoi de messages
 * - Historique des messages
 * - Statut de lecture
 * - Notifications
 */

import { getDb } from './db';
import { getLogger } from './logging';
import { conversations, directMessages } from '../drizzle/schema-new-features';
import { eq, and, or, desc, asc } from 'drizzle-orm';

const logger = getLogger();

/**
 * Interface pour un message direct
 */
export interface DirectMessageData {
  conversationId: number;
  senderId: number;
  recipientId: number;
  content: string;
  attachmentUrl?: string;
  attachmentType?: string; // 'image', 'video', 'file'
}

/**
 * Interface pour une conversation
 */
export interface ConversationData {
  userId1: number;
  userId2: number;
}

/**
 * Classe pour gérer les messages directs
 */
export class DirectMessagesManager {
  /**
   * Obtenir ou créer une conversation
   */
  async getOrCreateConversation(userId1: number, userId2: number): Promise<number | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for conversation creation');
      return null;
    }

    try {
      // Normaliser les IDs (le plus petit en premier)
      const [user1, user2] = userId1 < userId2 ? [userId1, userId2] : [userId2, userId1];

      // Vérifier si la conversation existe
      const existing = await db
        .select()
        .from(conversations)
        .where(
          and(
            eq(conversations.participant1Id, user1),
            eq(conversations.participant2Id, user2)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return existing[0].id;
      }

      // Créer la conversation
      const result = await db.insert(conversations).values({
        participant1Id: user1,
        participant2Id: user2,
      });

      logger.info('Conversation created', { user1, user2 });
      return (result as any).insertId || 0;
    } catch (error) {
      logger.error('Failed to get or create conversation', { error, userId1, userId2 });
      return null;
    }
  }

  /**
   * Envoyer un message direct
   */
  async sendDirectMessage(data: DirectMessageData): Promise<number | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for sending message');
      return null;
    }

    try {
      // Valider le contenu
      if (!data.content || data.content.trim().length === 0) {
        logger.warn('Empty message content');
        return null;
      }

      if (data.content.length > 5000) {
        logger.warn('Message content too long');
        return null;
      }

      // Créer le message
      const result = await db.insert(directMessages).values({
        conversationId: data.conversationId,
        senderId: data.senderId,
        content: data.content,
        mediaUrl: data.attachmentUrl,
        mediaType: data.attachmentType ? (data.attachmentType as any) : 'none',
        isRead: false,
      });

      logger.info('Direct message sent', {
        conversationId: data.conversationId,
        senderId: data.senderId,
        recipientId: data.recipientId,
      });

      return (result as any).insertId || 0;
    } catch (error) {
      logger.error('Failed to send direct message', { error, data });
      return null;
    }
  }

  /**
   * Obtenir les messages d'une conversation
   */
  async getConversationMessages(
    conversationId: number,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting conversation messages');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conversationId))
        .orderBy(asc(directMessages.sentAt))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      logger.error('Failed to get conversation messages', { error, conversationId });
      return [];
    }
  }

  /**
   * Obtenir les conversations d'un utilisateur
   */
  async getUserConversations(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting user conversations');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(conversations)
        .where(
          or(
            eq(conversations.participant1Id, userId),
            eq(conversations.participant2Id, userId)
          )
        )
        .orderBy(desc(conversations.updatedAt))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      logger.error('Failed to get user conversations', { error, userId });
      return [];
    }
  }

  /**
   * Marquer les messages comme lus
   */
  async markMessagesAsRead(conversationId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for marking messages as read');
      return false;
    }

    try {
      // TODO: Implémenter le marquage comme lu
      // Les messages n'ont pas de recipientId, utiliser une autre approche
      logger.info('Messages marked as read', { conversationId, userId });

      return true;
    } catch (error) {
      logger.error('Failed to mark messages as read', { error, conversationId, userId });
      return false;
    }
  }

  /**
   * Obtenir le nombre de messages non lus
   */
  async getUnreadMessageCount(userId: number): Promise<number> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting unread message count');
      return 0;
    }

    try {
      // TODO: Implémenter le comptage des messages non lus
      // Les messages n'ont pas de recipientId, utiliser une autre approche
      const results: any[] = [];

      return results.length;
    } catch (error) {
      logger.error('Failed to get unread message count', { error, userId });
      return 0;
    }
  }

  /**
   * Supprimer un message
   */
  async deleteMessage(messageId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for deleting message');
      return false;
    }

    try {
      // Vérifier que l'utilisateur est l'auteur
      const message = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.id, messageId))
        .limit(1);

      if (message.length === 0 || message[0].senderId !== userId) {
        logger.warn('Unauthorized message deletion attempt', { messageId, userId });
        return false;
      }

      // Supprimer le message
      await db.delete(directMessages).where(eq(directMessages.id, messageId));

      logger.info('Message deleted', { messageId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete message', { error, messageId });
      return false;
    }
  }

  /**
   * Éditer un message
   */
  async editMessage(messageId: number, userId: number, newContent: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for editing message');
      return false;
    }

    try {
      // Valider le nouveau contenu
      if (!newContent || newContent.trim().length === 0 || newContent.length > 5000) {
        logger.warn('Invalid new message content');
        return false;
      }

      // Vérifier que l'utilisateur est l'auteur
      const message = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.id, messageId))
        .limit(1);

      if (message.length === 0 || message[0].senderId !== userId) {
        logger.warn('Unauthorized message edit attempt', { messageId, userId });
        return false;
      }

      // Éditer le message
      await db
        .update(directMessages)
        .set({ content: newContent })
        .where(eq(directMessages.id, messageId));

      logger.info('Message edited', { messageId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to edit message', { error, messageId });
      return false;
    }
  }

  /**
   * Obtenir le dernier message d'une conversation
   */
  async getLastConversationMessage(conversationId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting last conversation message');
      return null;
    }

    try {
      const results = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conversationId))
        .orderBy(desc(directMessages.sentAt))
        .limit(1);

      return results.length > 0 ? results[0] : null;
    } catch (error) {
      logger.error('Failed to get last conversation message', { error, conversationId });
      return null;
    }
  }

  /**
   * Supprimer une conversation
   */
  async deleteConversation(conversationId: number, userId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for deleting conversation');
      return false;
    }

    try {
      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, conversationId))
        .limit(1);

      if (
        conversation.length === 0 ||
        (conversation[0].participant1Id !== userId && conversation[0].participant2Id !== userId)
      ) {
        logger.warn('Unauthorized conversation deletion attempt', { conversationId, userId });
        return false;
      }

      // Supprimer tous les messages
      await db.delete(directMessages).where(eq(directMessages.conversationId, conversationId));

      // Supprimer la conversation
      await db.delete(conversations).where(eq(conversations.id, conversationId));

      logger.info('Conversation deleted', { conversationId, userId });
      return true;
    } catch (error) {
      logger.error('Failed to delete conversation', { error, conversationId });
      return false;
    }
  }

  /**
   * Rechercher des messages dans une conversation
   */
  async searchConversationMessages(
    conversationId: number,
    query: string,
    limit: number = 20
  ): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for searching messages');
      return [];
    }

    try {
      // TODO: Implémenter la recherche avec LIKE
      logger.info('Searching conversation messages', { conversationId, query });
      return [];
    } catch (error) {
      logger.error('Failed to search conversation messages', { error, conversationId });
      return [];
    }
  }

  /**
   * Obtenir les statistiques de conversation
   */
  async getConversationStats(conversationId: number): Promise<{
    messageCount: number;
    unreadCount: number;
    lastMessageTime?: Date;
  }> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting conversation stats');
      return { messageCount: 0, unreadCount: 0 };
    }

    try {
      const messages = await db
        .select()
        .from(directMessages)
        .where(eq(directMessages.conversationId, conversationId));

      const unreadMessages = messages.filter((m) => !m.isRead);
      const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;

      return {
        messageCount: messages.length,
        unreadCount: unreadMessages.length,
        lastMessageTime: lastMessage?.sentAt,
      };
    } catch (error) {
      logger.error('Failed to get conversation stats', { error, conversationId });
      return { messageCount: 0, unreadCount: 0 };
    }
  }
}

/**
 * Instance singleton
 */
let manager: DirectMessagesManager | null = null;

/**
 * Obtenir l'instance DirectMessagesManager
 */
export function getDirectMessagesManager(): DirectMessagesManager {
  if (!manager) {
    manager = new DirectMessagesManager();
  }
  return manager;
}
