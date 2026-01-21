/**
 * Système de hashtags et mentions pour Afritok
 * 
 * Gère :
 * - Création et gestion des hashtags
 * - Hashtags tendances
 * - Mentions d'utilisateurs
 * - Recherche de hashtags
 * - Statistiques de hashtags
 */

import { getDb } from './db';
import { getLogger } from './logging';
import { hashtags, videoHashtags, mentions } from '../drizzle/schema-new-features';
import { eq, like, desc, and, inArray } from 'drizzle-orm';

const logger = getLogger();

/**
 * Interface pour un hashtag
 */
export interface HashtagData {
  name: string;
  category?: string;
}

/**
 * Interface pour les statistiques d'un hashtag
 */
export interface HashtagStats {
  id: number;
  name: string;
  videoCount: number;
  viewCount: number;
  trendingRank?: number;
  category?: string;
  createdAt: Date;
}

/**
 * Interface pour une mention
 */
export interface MentionData {
  videoId: number;
  mentionedUserId: number;
  creatorId: number;
  timestamp: number; // Position dans la vidéo (ms)
}

/**
 * Classe pour gérer les hashtags et mentions
 */
export class HashtagsMentionsManager {
  /**
   * Créer ou obtenir un hashtag
   */
  async getOrCreateHashtag(name: string, category?: string): Promise<number> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for hashtag creation');
      return 0;
    }

    try {
      // Normaliser le nom du hashtag
      const normalizedName = name.toLowerCase().replace(/^#/, '');

      // Vérifier si le hashtag existe
      const existing = await db
        .select()
        .from(hashtags)
        .where(eq(hashtags.name, normalizedName))
        .limit(1);

      if (existing.length > 0) {
        return existing[0].id;
      }

      // Créer le hashtag
      const result = await db.insert(hashtags).values({
        name: normalizedName,
        category,
        videoCount: 0,
        viewCount: 0,
      });

      logger.info('Hashtag created', { name: normalizedName });
      return (result as any).insertId || 0;
    } catch (error) {
      logger.error('Failed to create hashtag', { error, name });
      return 0;
    }
  }

  /**
   * Ajouter un hashtag à une vidéo
   */
  async addHashtagToVideo(videoId: number, hashtagName: string): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for adding hashtag to video');
      return false;
    }

    try {
      // Obtenir ou créer le hashtag
      const hashtagId = await this.getOrCreateHashtag(hashtagName);
      if (!hashtagId) {
        return false;
      }

      // Vérifier si l'association existe déjà
      const existing = await db
        .select()
        .from(videoHashtags)
        .where(
          and(
            eq(videoHashtags.videoId, videoId),
            eq(videoHashtags.hashtagId, hashtagId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return true; // Déjà associé
      }

      // Ajouter l'association
      await db.insert(videoHashtags).values({
        videoId,
        hashtagId,
      });

      // Incrémenter le compteur de vidéos du hashtag
      await db
        .update(hashtags)
        .set({
          videoCount: (await db.select().from(hashtags).where(eq(hashtags.id, hashtagId)))[0]
            .videoCount + 1,
        })
        .where(eq(hashtags.id, hashtagId));

      logger.info('Hashtag added to video', { videoId, hashtagName });
      return true;
    } catch (error) {
      logger.error('Failed to add hashtag to video', { error, videoId, hashtagName });
      return false;
    }
  }

  /**
   * Extraire et traiter les hashtags d'une description
   */
  async processHashtagsFromDescription(videoId: number, description: string): Promise<void> {
    try {
      // Extraire les hashtags avec regex
      const hashtagRegex = /#[\w\u0080-\uFFFF]+/g;
      const foundHashtags = description.match(hashtagRegex) || [];

      // Ajouter chaque hashtag à la vidéo
      for (const hashtag of foundHashtags) {
        await this.addHashtagToVideo(videoId, hashtag);
      }

      logger.info('Hashtags processed from description', { videoId, count: foundHashtags.length });
    } catch (error) {
      logger.error('Failed to process hashtags from description', { error, videoId });
    }
  }

  /**
   * Obtenir les hashtags tendances
   */
  async getTrendingHashtags(limit: number = 20, offset: number = 0): Promise<HashtagStats[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for trending hashtags retrieval');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(hashtags)
        .orderBy(desc(hashtags.videoCount))
        .limit(limit)
        .offset(offset);

      return results.map((row, index) => ({
        id: row.id,
        name: row.name,
        videoCount: row.videoCount,
        viewCount: row.viewCount,
        trendingRank: index + 1 + offset,
        category: row.category || undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to get trending hashtags', { error });
      return [];
    }
  }

  /**
   * Rechercher des hashtags
   */
  async searchHashtags(query: string, limit: number = 10): Promise<HashtagStats[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for hashtag search');
      return [];
    }

    try {
      const normalizedQuery = query.toLowerCase().replace(/^#/, '');

      const results = await db
        .select()
        .from(hashtags)
        .where(like(hashtags.name, `%${normalizedQuery}%`))
        .orderBy(desc(hashtags.videoCount))
        .limit(limit);

      return results.map((row) => ({
        id: row.id,
        name: row.name,
        videoCount: row.videoCount,
        viewCount: row.viewCount,
        category: row.category || undefined,
        createdAt: row.createdAt,
      }));
    } catch (error) {
      logger.error('Failed to search hashtags', { error, query });
      return [];
    }
  }

  /**
   * Obtenir les vidéos d'un hashtag
   */
  async getVideosByHashtag(hashtagName: string, limit: number = 20, offset: number = 0): Promise<number[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting videos by hashtag');
      return [];
    }

    try {
      const normalizedName = hashtagName.toLowerCase().replace(/^#/, '');

      // Obtenir le hashtag
      const hashtagRow = await db
        .select()
        .from(hashtags)
        .where(eq(hashtags.name, normalizedName))
        .limit(1);

      if (hashtagRow.length === 0) {
        return [];
      }

      // Obtenir les vidéos associées
      const results = await db
        .select()
        .from(videoHashtags)
        .where(eq(videoHashtags.hashtagId, hashtagRow[0].id))
        .limit(limit)
        .offset(offset);

      return results.map((row) => row.videoId);
    } catch (error) {
      logger.error('Failed to get videos by hashtag', { error, hashtagName });
      return [];
    }
  }

  /**
   * Ajouter une mention
   */
  async addMention(data: MentionData): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for adding mention');
      return false;
    }

    try {
      await db.insert(mentions).values({
        videoId: data.videoId,
        mentionedUserId: data.mentionedUserId,
        creatorId: data.creatorId,
        timestamp: data.timestamp,
      });

      logger.info('Mention added', {
        videoId: data.videoId,
        mentionedUserId: data.mentionedUserId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to add mention', { error, data });
      return false;
    }
  }

  /**
   * Extraire et traiter les mentions d'une description
   */
  async processMentionsFromDescription(
    videoId: number,
    creatorId: number,
    description: string,
    getUserIdByUsername: (username: string) => Promise<number | null>
  ): Promise<void> {
    try {
      // Extraire les mentions avec regex
      const mentionRegex = /@[\w\u0080-\uFFFF]+/g;
      const foundMentions = description.match(mentionRegex) || [];

      // Ajouter chaque mention
      for (const mention of foundMentions) {
        const username = mention.substring(1); // Retirer le @
        const userId = await getUserIdByUsername(username);

        if (userId) {
          await this.addMention({
            videoId,
            mentionedUserId: userId,
            creatorId,
            timestamp: 0, // Mention dans la description
          });
        }
      }

      logger.info('Mentions processed from description', { videoId, count: foundMentions.length });
    } catch (error) {
      logger.error('Failed to process mentions from description', { error, videoId });
    }
  }

  /**
   * Obtenir les mentions d'une vidéo
   */
  async getVideoMentions(videoId: number): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video mentions');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(mentions)
        .where(eq(mentions.videoId, videoId));

      return results;
    } catch (error) {
      logger.error('Failed to get video mentions', { error, videoId });
      return [];
    }
  }

  /**
   * Obtenir les mentions reçues par un utilisateur
   */
  async getUserMentions(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting user mentions');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(mentions)
        .where(eq(mentions.mentionedUserId, userId))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      logger.error('Failed to get user mentions', { error, userId });
      return [];
    }
  }

  /**
   * Obtenir les hashtags d'une vidéo
   */
  async getVideoHashtags(videoId: number): Promise<string[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video hashtags');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(videoHashtags)
        .where(eq(videoHashtags.videoId, videoId));

      // Récupérer les noms des hashtags
      const hashtagIds = results.map((row) => row.hashtagId);
      if (hashtagIds.length === 0) {
        return [];
      }

      const hashtagRows = await db
        .select()
        .from(hashtags)
        .where(inArray(hashtags.id, hashtagIds));

      return hashtagRows.map((row) => `#${row.name}`);
    } catch (error) {
      logger.error('Failed to get video hashtags', { error, videoId });
      return [];
    }
  }

  /**
   * Incrémenter les vues d'un hashtag
   */
  async incrementHashtagViews(hashtagName: string, count: number = 1): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const normalizedName = hashtagName.toLowerCase().replace(/^#/, '');

      const hashtagRow = await db
        .select()
        .from(hashtags)
        .where(eq(hashtags.name, normalizedName))
        .limit(1);

      if (hashtagRow.length > 0) {
        await db
          .update(hashtags)
          .set({
            viewCount: hashtagRow[0].viewCount + count,
          })
          .where(eq(hashtags.id, hashtagRow[0].id));
      }
    } catch (error) {
      logger.error('Failed to increment hashtag views', { error, hashtagName });
    }
  }

  /**
   * Obtenir les statistiques d'un hashtag
   */
  async getHashtagStats(hashtagName: string): Promise<HashtagStats | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting hashtag stats');
      return null;
    }

    try {
      const normalizedName = hashtagName.toLowerCase().replace(/^#/, '');

      const result = await db
        .select()
        .from(hashtags)
        .where(eq(hashtags.name, normalizedName))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: row.id,
        name: row.name,
        videoCount: row.videoCount,
        viewCount: row.viewCount,
        category: row.category || undefined,
        createdAt: row.createdAt,
      };
    } catch (error) {
      logger.error('Failed to get hashtag stats', { error, hashtagName });
      return null;
    }
  }
}

/**
 * Instance singleton
 */
let manager: HashtagsMentionsManager | null = null;

/**
 * Obtenir l'instance HashtagsMentionsManager
 */
export function getHashtagsMentionsManager(): HashtagsMentionsManager {
  if (!manager) {
    manager = new HashtagsMentionsManager();
  }
  return manager;
}
