/**
 * Système de Duets et Stitches pour Afritok
 * 
 * Gère :
 * - Création de duets (vidéos côte à côte)
 * - Création de stitches (réponses avec extraits)
 * - Gestion des layouts de duets
 * - Notifications de duets/stitches créés
 */

import { getDb } from './db';
import { getLogger } from './logging';
import { duets, stitches } from '../drizzle/schema-new-features';
import { eq, desc } from 'drizzle-orm';

const logger = getLogger();

/**
 * Types de layouts pour les duets
 */
export enum DuetLayout {
  SIDE_BY_SIDE = 'side-by-side',
  PICTURE_IN_PICTURE = 'picture-in-picture',
  SPLIT = 'split',
}

/**
 * Interface pour un duet
 */
export interface DuetData {
  originalVideoId: number;
  duetVideoId: number;
  layout: DuetLayout;
}

/**
 * Interface pour un stitch
 */
export interface StitchData {
  originalVideoId: number;
  stitchVideoId: number;
  clipStartTime: number; // en ms
  clipEndTime: number; // en ms
}

/**
 * Classe pour gérer les duets et stitches
 */
export class DuetsStitchesManager {
  /**
   * Créer un duet
   */
  async createDuet(data: DuetData): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for duet creation');
      return false;
    }

    try {
      // Vérifier que les deux vidéos existent
      // TODO: Ajouter une vérification des vidéos

      // Vérifier que le duet n'existe pas déjà
      const existing = await db
        .select()
        .from(duets)
        .where(eq(duets.duetVideoId, data.duetVideoId))
        .limit(1);

      if (existing.length > 0) {
        logger.warn('Duet already exists', { duetVideoId: data.duetVideoId });
        return false;
      }

      // Créer le duet
      await db.insert(duets).values({
        originalVideoId: data.originalVideoId,
        duetVideoId: data.duetVideoId,
        layout: data.layout,
      });

      logger.info('Duet created', {
        originalVideoId: data.originalVideoId,
        duetVideoId: data.duetVideoId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to create duet', { error, data });
      return false;
    }
  }

  /**
   * Créer un stitch
   */
  async createStitch(data: StitchData): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for stitch creation');
      return false;
    }

    try {
      // Vérifier que les deux vidéos existent
      // TODO: Ajouter une vérification des vidéos

      // Vérifier que le stitch n'existe pas déjà
      const existing = await db
        .select()
        .from(stitches)
        .where(eq(stitches.stitchVideoId, data.stitchVideoId))
        .limit(1);

      if (existing.length > 0) {
        logger.warn('Stitch already exists', { stitchVideoId: data.stitchVideoId });
        return false;
      }

      // Vérifier que les timestamps sont valides
      if (data.clipStartTime >= data.clipEndTime) {
        logger.warn('Invalid clip timestamps', { data });
        return false;
      }

      // Créer le stitch
      await db.insert(stitches).values({
        originalVideoId: data.originalVideoId,
        stitchVideoId: data.stitchVideoId,
        clipStartTime: data.clipStartTime,
        clipEndTime: data.clipEndTime,
      });

      logger.info('Stitch created', {
        originalVideoId: data.originalVideoId,
        stitchVideoId: data.stitchVideoId,
      });
      return true;
    } catch (error) {
      logger.error('Failed to create stitch', { error, data });
      return false;
    }
  }

  /**
   * Obtenir les duets d'une vidéo
   */
  async getVideoDuets(videoId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video duets');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(duets)
        .where(eq(duets.originalVideoId, videoId))
        .orderBy(desc(duets.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      logger.error('Failed to get video duets', { error, videoId });
      return [];
    }
  }

  /**
   * Obtenir les stitches d'une vidéo
   */
  async getVideoStitches(videoId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video stitches');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(stitches)
        .where(eq(stitches.originalVideoId, videoId))
        .orderBy(desc(stitches.createdAt))
        .limit(limit)
        .offset(offset);

      return results;
    } catch (error) {
      logger.error('Failed to get video stitches', { error, videoId });
      return [];
    }
  }

  /**
   * Obtenir le duet d'une vidéo
   */
  async getVideoDuetInfo(videoId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video duet info');
      return null;
    }

    try {
      const result = await db
        .select()
        .from(duets)
        .where(eq(duets.duetVideoId, videoId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('Failed to get video duet info', { error, videoId });
      return null;
    }
  }

  /**
   * Obtenir le stitch d'une vidéo
   */
  async getVideoStitchInfo(videoId: number): Promise<any | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting video stitch info');
      return null;
    }

    try {
      const result = await db
        .select()
        .from(stitches)
        .where(eq(stitches.stitchVideoId, videoId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      logger.error('Failed to get video stitch info', { error, videoId });
      return null;
    }
  }

  /**
   * Supprimer un duet
   */
  async deleteDuet(duetVideoId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for deleting duet');
      return false;
    }

    try {
      await db.delete(duets).where(eq(duets.duetVideoId, duetVideoId));

      logger.info('Duet deleted', { duetVideoId });
      return true;
    } catch (error) {
      logger.error('Failed to delete duet', { error, duetVideoId });
      return false;
    }
  }

  /**
   * Supprimer un stitch
   */
  async deleteStitch(stitchVideoId: number): Promise<boolean> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for deleting stitch');
      return false;
    }

    try {
      await db.delete(stitches).where(eq(stitches.stitchVideoId, stitchVideoId));

      logger.info('Stitch deleted', { stitchVideoId });
      return true;
    } catch (error) {
      logger.error('Failed to delete stitch', { error, stitchVideoId });
      return false;
    }
  }

  /**
   * Obtenir les duets créés par un utilisateur
   */
  async getUserDuets(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting user duets');
      return [];
    }

    try {
      // TODO: Implémenter la requête pour obtenir les duets créés par un utilisateur
      // Cela nécessite une jointure avec la table videos pour obtenir le creatorId
      return [];
    } catch (error) {
      logger.error('Failed to get user duets', { error, userId });
      return [];
    }
  }

  /**
   * Obtenir les stitches créés par un utilisateur
   */
  async getUserStitches(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for getting user stitches');
      return [];
    }

    try {
      // TODO: Implémenter la requête pour obtenir les stitches créés par un utilisateur
      // Cela nécessite une jointure avec la table videos pour obtenir le creatorId
      return [];
    } catch (error) {
      logger.error('Failed to get user stitches', { error, userId });
      return [];
    }
  }

  /**
   * Compter les duets d'une vidéo
   */
  async countVideoDuets(videoId: number): Promise<number> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for counting video duets');
      return 0;
    }

    try {
      const result = await db
        .select()
        .from(duets)
        .where(eq(duets.originalVideoId, videoId));

      return result.length;
    } catch (error) {
      logger.error('Failed to count video duets', { error, videoId });
      return 0;
    }
  }

  /**
   * Compter les stitches d'une vidéo
   */
  async countVideoStitches(videoId: number): Promise<number> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for counting video stitches');
      return 0;
    }

    try {
      const result = await db
        .select()
        .from(stitches)
        .where(eq(stitches.originalVideoId, videoId));

      return result.length;
    } catch (error) {
      logger.error('Failed to count video stitches', { error, videoId });
      return 0;
    }
  }

  /**
   * Obtenir les statistiques de duets/stitches d'une vidéo
   */
  async getVideoCollaborationStats(videoId: number): Promise<{
    duetCount: number;
    stitchCount: number;
    totalCollaborations: number;
  }> {
    try {
      const duetCount = await this.countVideoDuets(videoId);
      const stitchCount = await this.countVideoStitches(videoId);

      return {
        duetCount,
        stitchCount,
        totalCollaborations: duetCount + stitchCount,
      };
    } catch (error) {
      logger.error('Failed to get video collaboration stats', { error, videoId });
      return {
        duetCount: 0,
        stitchCount: 0,
        totalCollaborations: 0,
      };
    }
  }

  /**
   * Valider les layouts de duet
   */
  isValidLayout(layout: string): boolean {
    return Object.values(DuetLayout).includes(layout as DuetLayout);
  }

  /**
   * Obtenir les layouts disponibles
   */
  getAvailableLayouts(): DuetLayout[] {
    return Object.values(DuetLayout);
  }
}

/**
 * Instance singleton
 */
let manager: DuetsStitchesManager | null = null;

/**
 * Obtenir l'instance DuetsStitchesManager
 */
export function getDuetsStitchesManager(): DuetsStitchesManager {
  if (!manager) {
    manager = new DuetsStitchesManager();
  }
  return manager;
}
