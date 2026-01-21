/**
 * Système d'analytics détaillées pour Afritok
 * 
 * Gère :
 * - Analytics vidéo (vues, likes, commentaires, etc.)
 * - Analytics créateur (followers, vues totales, engagement)
 * - Analytics quotidiennes
 * - Démographie des viewers
 * - Taux de rétention
 */

import { getDb } from './db';
import { getLogger } from './logging';
import {
  videoAnalytics,
  creatorAnalytics,
  dailyAnalytics,
} from '../drizzle/schema-new-features';
import { eq, and, gte, lte } from 'drizzle-orm';

const logger = getLogger();

/**
 * Interface pour les analytics vidéo
 */
export interface VideoAnalyticsData {
  videoId: number;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
  averageWatchTime: number; // en secondes
  completionRate: number; // en %
  engagementRate: number; // en %
}

/**
 * Interface pour les analytics créateur
 */
export interface CreatorAnalyticsData {
  userId: number;
  totalFollowers: number;
  followerGrowth: number; // par mois
  totalViews: number;
  totalEngagement: number;
  totalVideos: number;
  averageEngagementRate: number; // en %
}

/**
 * Interface pour les analytics quotidiennes
 */
export interface DailyAnalyticsData {
  videoId: number;
  date: Date;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  saves: number;
}

/**
 * Interface pour la démographie des viewers
 */
export interface ViewerDemographics {
  ageGroups: Record<string, number>; // ex: "18-24": 1000
  genders: Record<string, number>; // ex: "male": 1000, "female": 900
  countries: Array<{ country: string; count: number }>;
  devices: Record<string, number>; // ex: "mobile": 1500, "desktop": 400
}

/**
 * Classe pour gérer les analytics
 */
export class AnalyticsManager {
  /**
   * Créer ou mettre à jour les analytics vidéo
   */
  async updateVideoAnalytics(data: VideoAnalyticsData): Promise<void> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for analytics update');
      return;
    }

    try {
      // Vérifier si l'enregistrement existe
      const existing = await db
        .select()
        .from(videoAnalytics)
        .where(eq(videoAnalytics.videoId, data.videoId))
        .limit(1);

      if (existing.length > 0) {
        // Mettre à jour
        await db
          .update(videoAnalytics)
          .set({
            views: data.views,
            likes: data.likes,
            comments: data.comments,
            shares: data.shares,
            saves: data.saves,
            averageWatchTime: data.averageWatchTime,
            completionRate: data.completionRate.toString(),
            engagementRate: data.engagementRate.toString(),
          } as any)
          .where(eq(videoAnalytics.videoId, data.videoId));
      } else {
        // Créer
        await db.insert(videoAnalytics).values({
          videoId: data.videoId,
          views: data.views,
          likes: data.likes,
          comments: data.comments,
          shares: data.shares,
          saves: data.saves,
          averageWatchTime: data.averageWatchTime,
          completionRate: data.completionRate.toString(),
          engagementRate: data.engagementRate.toString(),
        } as any);
      }

      logger.info('Video analytics updated', { videoId: data.videoId });
    } catch (error) {
      logger.error('Failed to update video analytics', { error, videoId: data.videoId });
    }
  }

  /**
   * Obtenir les analytics vidéo
   */
  async getVideoAnalytics(videoId: number): Promise<VideoAnalyticsData | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for analytics retrieval');
      return null;
    }

    try {
      const result = await db
        .select()
        .from(videoAnalytics)
        .where(eq(videoAnalytics.videoId, videoId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        videoId: row.videoId,
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves,
        averageWatchTime: row.averageWatchTime,
        completionRate: Number(row.completionRate),
        engagementRate: Number(row.engagementRate),
      };
    } catch (error) {
      logger.error('Failed to get video analytics', { error, videoId });
      return null;
    }
  }

  /**
   * Incrémenter les vues vidéo
   */
  async incrementVideoViews(videoId: number, count: number = 1): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics) {
        await this.updateVideoAnalytics({
          ...analytics,
          views: analytics.views + count,
        });
      }
    } catch (error) {
      logger.error('Failed to increment video views', { error, videoId });
    }
  }

  /**
   * Incrémenter les likes vidéo
   */
  async incrementVideoLikes(videoId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics) {
        await this.updateVideoAnalytics({
          ...analytics,
          likes: analytics.likes + 1,
          engagementRate: this.calculateEngagementRate(
            analytics.views,
            analytics.likes + 1,
            analytics.comments,
            analytics.shares,
            analytics.saves
          ),
        });
      }
    } catch (error) {
      logger.error('Failed to increment video likes', { error, videoId });
    }
  }

  /**
   * Décrémenter les likes vidéo
   */
  async decrementVideoLikes(videoId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics && analytics.likes > 0) {
        await this.updateVideoAnalytics({
          ...analytics,
          likes: analytics.likes - 1,
          engagementRate: this.calculateEngagementRate(
            analytics.views,
            analytics.likes - 1,
            analytics.comments,
            analytics.shares,
            analytics.saves
          ),
        });
      }
    } catch (error) {
      logger.error('Failed to decrement video likes', { error, videoId });
    }
  }

  /**
   * Incrémenter les commentaires vidéo
   */
  async incrementVideoComments(videoId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics) {
        await this.updateVideoAnalytics({
          ...analytics,
          comments: analytics.comments + 1,
          engagementRate: this.calculateEngagementRate(
            analytics.views,
            analytics.likes,
            analytics.comments + 1,
            analytics.shares,
            analytics.saves
          ),
        });
      }
    } catch (error) {
      logger.error('Failed to increment video comments', { error, videoId });
    }
  }

  /**
   * Incrémenter les partages vidéo
   */
  async incrementVideoShares(videoId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics) {
        await this.updateVideoAnalytics({
          ...analytics,
          shares: analytics.shares + 1,
          engagementRate: this.calculateEngagementRate(
            analytics.views,
            analytics.likes,
            analytics.comments,
            analytics.shares + 1,
            analytics.saves
          ),
        });
      }
    } catch (error) {
      logger.error('Failed to increment video shares', { error, videoId });
    }
  }

  /**
   * Incrémenter les sauvegardes vidéo
   */
  async incrementVideoSaves(videoId: number): Promise<void> {
    const db = await getDb();
    if (!db) return;

    try {
      const analytics = await this.getVideoAnalytics(videoId);
      if (analytics) {
        await this.updateVideoAnalytics({
          ...analytics,
          saves: analytics.saves + 1,
          engagementRate: this.calculateEngagementRate(
            analytics.views,
            analytics.likes,
            analytics.comments,
            analytics.shares,
            analytics.saves + 1
          ),
        });
      }
    } catch (error) {
      logger.error('Failed to increment video saves', { error, videoId });
    }
  }

  /**
   * Mettre à jour les analytics créateur
   */
  async updateCreatorAnalytics(data: CreatorAnalyticsData): Promise<void> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for creator analytics update');
      return;
    }

    try {
      const existing = await db
        .select()
        .from(creatorAnalytics)
        .where(eq(creatorAnalytics.userId, data.userId))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(creatorAnalytics)
          .set({
            totalFollowers: data.totalFollowers,
            followerGrowth: data.followerGrowth,
            totalViews: data.totalViews,
            totalEngagement: data.totalEngagement,
            totalVideos: data.totalVideos,
            averageEngagementRate: data.averageEngagementRate.toString(),
          } as any)
          .where(eq(creatorAnalytics.userId, data.userId));
      } else {
        await db.insert(creatorAnalytics).values({
          userId: data.userId,
          totalFollowers: data.totalFollowers,
          followerGrowth: data.followerGrowth,
          totalViews: data.totalViews,
          totalEngagement: data.totalEngagement,
          totalVideos: data.totalVideos,
          averageEngagementRate: data.averageEngagementRate.toString(),
        } as any);
      }

      logger.info('Creator analytics updated', { userId: data.userId });
    } catch (error) {
      logger.error('Failed to update creator analytics', { error, userId: data.userId });
    }
  }

  /**
   * Obtenir les analytics créateur
   */
  async getCreatorAnalytics(userId: number): Promise<CreatorAnalyticsData | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for creator analytics retrieval');
      return null;
    }

    try {
      const result = await db
        .select()
        .from(creatorAnalytics)
        .where(eq(creatorAnalytics.userId, userId))
        .limit(1);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        userId: row.userId,
        totalFollowers: row.totalFollowers,
        followerGrowth: row.followerGrowth,
        totalViews: row.totalViews,
        totalEngagement: row.totalEngagement,
        totalVideos: row.totalVideos,
        averageEngagementRate: Number(row.averageEngagementRate),
      };
    } catch (error) {
      logger.error('Failed to get creator analytics', { error, userId });
      return null;
    }
  }

  /**
   * Enregistrer les analytics quotidiennes
   */
  async recordDailyAnalytics(data: DailyAnalyticsData): Promise<void> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for daily analytics recording');
      return;
    }

    try {
      await db.insert(dailyAnalytics).values({
        videoId: data.videoId,
        date: data.date,
        views: data.views,
        likes: data.likes,
        comments: data.comments,
        shares: data.shares,
        saves: data.saves,
      });

      logger.info('Daily analytics recorded', { videoId: data.videoId, date: data.date });
    } catch (error) {
      logger.error('Failed to record daily analytics', { error, videoId: data.videoId });
    }
  }

  /**
   * Obtenir les analytics quotidiennes d'une vidéo
   */
  async getDailyAnalytics(
    videoId: number,
    startDate: Date,
    endDate: Date
  ): Promise<DailyAnalyticsData[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for daily analytics retrieval');
      return [];
    }

    try {
      const results = await db
        .select()
        .from(dailyAnalytics)
        .where(
          and(
            eq(dailyAnalytics.videoId, videoId),
            gte(dailyAnalytics.date, startDate),
            lte(dailyAnalytics.date, endDate)
          )
        );

      return results.map((row) => ({
        videoId: row.videoId,
        date: row.date,
        views: row.views,
        likes: row.likes,
        comments: row.comments,
        shares: row.shares,
        saves: row.saves,
      }));
    } catch (error) {
      logger.error('Failed to get daily analytics', { error, videoId });
      return [];
    }
  }

  /**
   * Calculer le taux d'engagement
   */
  private calculateEngagementRate(
    views: number,
    likes: number,
    comments: number,
    shares: number,
    saves: number
  ): number {
    if (views === 0) return 0;
    const totalEngagement = likes + comments + shares + saves;
    return (totalEngagement / views) * 100;
  }

  /**
   * Obtenir les vidéos les plus performantes d'un créateur
   */
  async getTopVideos(userId: number, limit: number = 10): Promise<any[]> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for top videos retrieval');
      return [];
    }

    try {
      // TODO: Implémenter la requête pour obtenir les vidéos les plus performantes
      // Cela nécessite une jointure avec la table videos
      logger.info('Top videos retrieved', { userId, limit });
      return [];
    } catch (error) {
      logger.error('Failed to get top videos', { error, userId });
      return [];
    }
  }

  /**
   * Obtenir les statistiques d'engagement
   */
  async getEngagementStats(userId: number): Promise<any> {
    try {
      const creatorAnalytics = await this.getCreatorAnalytics(userId);
      if (!creatorAnalytics) {
        return null;
      }

      return {
        totalFollowers: creatorAnalytics.totalFollowers,
        totalViews: creatorAnalytics.totalViews,
        totalEngagement: creatorAnalytics.totalEngagement,
        averageEngagementRate: creatorAnalytics.averageEngagementRate,
        engagementPerVideo: creatorAnalytics.totalVideos > 0 
          ? creatorAnalytics.totalEngagement / creatorAnalytics.totalVideos 
          : 0,
      };
    } catch (error) {
      logger.error('Failed to get engagement stats', { error, userId });
      return null;
    }
  }
}

/**
 * Instance singleton
 */
let analyticsManager: AnalyticsManager | null = null;

/**
 * Obtenir l'instance AnalyticsManager
 */
export function getAnalyticsManager(): AnalyticsManager {
  if (!analyticsManager) {
    analyticsManager = new AnalyticsManager();
  }
  return analyticsManager;
}
