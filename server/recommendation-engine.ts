/**
 * Moteur de recommandation pour Afritok
 * 
 * Algorithme de recommandation basé sur :
 * - Historique de visionnage
 * - Engagement (likes, commentaires, partages)
 * - Profil utilisateur
 * - Tendances actuelles
 * - Contenu similaire
 */

import { getDb } from './db';
import { getLogger } from './logging';
import { sql } from 'drizzle-orm';

const logger = getLogger();

/**
 * Interface pour le score de recommandation
 */
export interface RecommendationScore {
  videoId: number;
  score: number; // 0-100
  reason: string; // Raison de la recommandation
  category?: string;
}

/**
 * Interface pour l'historique de visionnage
 */
export interface ViewHistory {
  userId: number;
  videoId: number;
  watchedAt: Date;
  watchDuration: number; // en secondes
  completionRate: number; // en %
}

/**
 * Interface pour le profil utilisateur
 */
export interface UserProfile {
  userId: number;
  preferences: Record<string, number>; // catégorie -> score
  followingIds: number[];
  blockedIds: number[];
  likedVideoIds: number[];
}

/**
 * Classe pour gérer l'algorithme de recommandation
 */
export class RecommendationEngine {
  private readonly TRENDING_WEIGHT = 0.2; // 20% pour les tendances
  private readonly ENGAGEMENT_WEIGHT = 0.3; // 30% pour l'engagement
  private readonly SIMILARITY_WEIGHT = 0.3; // 30% pour la similarité
  private readonly FOLLOWING_WEIGHT = 0.2; // 20% pour les suivis

  /**
   * Générer le feed personnalisé pour un utilisateur
   */
  async generatePersonalizedFeed(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<number[]> {
    try {
      logger.info('Generating personalized feed', { userId, limit, offset });

      // Obtenir le profil utilisateur
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile) {
        logger.warn('User profile not found', { userId });
        return await this.getDefaultFeed(limit, offset);
      }

      // Obtenir l'historique de visionnage
      const viewHistory = await this.getUserViewHistory(userId, 50);

      // Calculer les scores de recommandation
      const recommendations = await this.calculateRecommendationScores(
        userId,
        userProfile,
        viewHistory,
        limit * 3 // Récupérer 3x plus pour filtrer
      );

      // Trier par score et retourner les IDs vidéo
      const videoIds = recommendations
        .sort((a, b) => b.score - a.score)
        .slice(offset, offset + limit)
        .map((rec) => rec.videoId);

      logger.info('Personalized feed generated', { userId, count: videoIds.length });
      return videoIds;
    } catch (error) {
      logger.error('Failed to generate personalized feed', { error, userId });
      return await this.getDefaultFeed(limit, offset);
    }
  }

  /**
   * 🔧 1. FIX getDefaultFeed (ULTRA IMPORTANT)
   * Obtenir le feed par défaut (récent)
   */
  async getDefaultFeed(limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      const videos = await db.query.videos.findMany({
        orderBy: (v, { desc }) => [desc(v.createdAt)],
        limit,
        offset,
      });

      return videos.map(v => v.id);
    } catch (error) {
      logger.error('Failed to get default feed', { error });
      return [];
    }
  }

  /**
   * Obtenir le profil utilisateur
   */
  private async getUserProfile(userId: number): Promise<UserProfile | null> {
    try {
      // TODO: Récupérer le profil utilisateur de la base de données
      // Inclure : préférences, suivis, vidéos aimées, utilisateurs bloqués

      return {
        userId,
        preferences: {},
        followingIds: [],
        blockedIds: [],
        likedVideoIds: [],
      };
    } catch (error) {
      logger.error('Failed to get user profile', { error, userId });
      return null;
    }
  }

  /**
   * Obtenir l'historique de visionnage
   */
  private async getUserViewHistory(userId: number, limit: number = 50): Promise<ViewHistory[]> {
    try {
      // TODO: Récupérer l'historique de visionnage de la base de données
      return [];
    } catch (error) {
      logger.error('Failed to get user view history', { error, userId });
      return [];
    }
  }

  /**
   * Calculer les scores de recommandation
   */
  private async calculateRecommendationScores(
    userId: number,
    userProfile: UserProfile,
    viewHistory: ViewHistory[],
    limit: number
  ): Promise<RecommendationScore[]> {
    const scores: Map<number, RecommendationScore> = new Map();

    try {
      // 1. Score de tendance
      const trendingVideos = await this.getTrendingVideosPrivate(limit);
      for (const video of trendingVideos) {
        const score = this.calculateTrendingScore(video);
        this.updateScore(scores, video.id, score * this.TRENDING_WEIGHT, 'Trending');
      }

      // 2. Score d'engagement
      const engagementVideos = await this.getHighEngagementVideos(limit);
      for (const video of engagementVideos) {
        const score = this.calculateEngagementScore(video);
        this.updateScore(scores, video.id, score * this.ENGAGEMENT_WEIGHT, 'High engagement');
      }

      // 3. Score de similarité
      const similarVideos = await this.getSimilarVideos(viewHistory, limit);
      for (const video of similarVideos) {
        const score = this.calculateSimilarityScore(video, viewHistory);
        this.updateScore(scores, video.id, score * this.SIMILARITY_WEIGHT, 'Similar content');
      }

      // 4. Score des suivis
      const followingVideos = await this.getFollowingVideos(userProfile.followingIds, limit);
      for (const video of followingVideos) {
        const score = this.calculateFollowingScore(video);
        this.updateScore(scores, video.id, score * this.FOLLOWING_WEIGHT, 'From following');
      }

      // Filtrer les vidéos déjà visionnées et bloquées
      const filteredScores = Array.from(scores.values()).filter(
        (rec) =>
          !viewHistory.some((vh) => vh.videoId === rec.videoId) &&
          true && // 🟡 AMÉLIORATION RAPIDE : blockedIds = users, pas vidéos
          !userProfile.likedVideoIds.includes(rec.videoId) // Optionnel : éviter les vidéos aimées
      );

      return filteredScores;
    } catch (error) {
      logger.error('Failed to calculate recommendation scores', { error, userId });
      return [];
    }
  }

  /**
   * 🔧 2. FIX getTrendingVideosPrivate
   * Obtenir les vidéos trending (privé)
   */
  private async getTrendingVideosPrivate(limit: number): Promise<any[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db.query.videos.findMany({
        orderBy: (v, { desc }) => [desc(v.views)],
        limit,
      });
    } catch (error) {
      logger.error('Failed to get trending videos', { error });
      return [];
    }
  }

  /**
   * 🔧 3. FIX getHighEngagementVideos
   * Obtenir les vidéos avec engagement élevé
   */
  private async getHighEngagementVideos(limit: number): Promise<any[]> {
    try {
      const db = await getDb();
      if (!db) return [];

      return await db.query.videos.findMany({
        orderBy: (v, { desc }) => [
          desc(sql`(${v.likes} + ${v.comments} + ${v.shares})`)
        ],
        limit,
      });
    } catch (error) {
      logger.error('Failed to get high engagement videos', { error });
      return [];
    }
  }

  /**
   * Obtenir les vidéos similaires
   */
  private async getSimilarVideos(viewHistory: ViewHistory[], limit: number): Promise<any[]> {
    try {
      // TODO: Implémenter la requête pour obtenir les vidéos similaires
      // Basé sur les catégories, hashtags, créateurs des vidéos visionnées
      return [];
    } catch (error) {
      logger.error('Failed to get similar videos', { error });
      return [];
    }
  }

  /**
   * 🔧 4. FIX getFollowingVideos
   * Obtenir les vidéos des utilisateurs suivis
   */
  private async getFollowingVideos(followingIds: number[], limit: number): Promise<any[]> {
    try {
      const db = await getDb();
      if (!db || followingIds.length === 0) return [];

      return await db.query.videos.findMany({
        where: (v, { inArray }) => inArray(v.userId, followingIds),
        orderBy: (v, { desc }) => [desc(v.createdAt)],
        limit,
      });
    } catch (error) {
      logger.error('Failed to get following videos', { error });
      return [];
    }
  }

  /**
   * ⚠️ PETIT BUG À CORRIGER
   * Calculer le score de tendance
   */
  private calculateTrendingScore(video: any): number {
    // Score basé sur les vues, likes, commentaires, partages
    const viewsScore = Math.min(video.views / 10000, 100); // Normaliser à 100
    
    // Correction crash si views = 0
    const safeViews = video.views || 1;

    const engagementScore = Math.min(
      ((video.likes + video.comments + video.shares) / safeViews) * 100,
      100
    );
    return (viewsScore * 0.6 + engagementScore * 0.4) / 100;
  }

  /**
   * Calculer le score d'engagement
   */
  private calculateEngagementScore(video: any): number {
    // Score basé sur le taux d'engagement
    const safeViews = video.views || 1;
    const engagementRate = (video.likes + video.comments + video.shares) / safeViews;
    return Math.min(engagementRate * 100, 100) / 100;
  }

  /**
   * Calculer le score de similarité
   */
  private calculateSimilarityScore(video: any, viewHistory: ViewHistory[]): number {
    // Score basé sur la similarité avec l'historique de visionnage
    if (viewHistory.length === 0) {
      return 0;
    }

    // Calculer la similarité moyenne avec les vidéos visionnées
    let totalSimilarity = 0;
    for (const history of viewHistory) {
      // TODO: Implémenter la logique de similarité
      // Pour l'instant, retourner 0.5 (similarité moyenne)
      totalSimilarity += 0.5;
    }

    return totalSimilarity / viewHistory.length;
  }

  /**
   * Calculer le score des suivis
   */
  private calculateFollowingScore(video: any): number {
    // Score basé sur la récence et l'engagement
    const daysSinceCreation = Math.floor(
      (Date.now() - new Date(video.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const recencyScore = Math.max(1 - daysSinceCreation / 7, 0); // Décroissance sur 7 jours
    const engagementScore = Math.min(video.likes / 100, 1); // Normaliser

    return (recencyScore * 0.6 + engagementScore * 0.4);
  }

  /**
   * Mettre à jour le score
   */
  private updateScore(
    scores: Map<number, RecommendationScore>,
    videoId: number,
    score: number,
    reason: string
  ): void {
    const existing = scores.get(videoId);
    if (existing) {
      existing.score += score;
      existing.reason += `, ${reason}`;
    } else {
      scores.set(videoId, {
        videoId,
        score,
        reason,
      });
    }
  }

  /**
   * 🔧 5. FIX recordViewHistory (IMPORTANT POUR FUTUR IA)
   * Enregistrer l'historique de visionnage
   */
  async recordViewHistory(
    userId: number,
    videoId: number,
    watchDuration: number,
    completionRate: number
  ): Promise<void> {
    try {
      const db = await getDb();
      if (!db) return;

      await db.insert('view_history').values({
        userId,
        videoId,
        watchDuration,
        completionRate,
        watchedAt: new Date(),
      });
      
      logger.info('View history recorded', { userId, videoId, watchDuration, completionRate });
    } catch (error) {
      logger.error('Failed to record view history', { error, userId, videoId });
    }
  }

  /**
   * Obtenir les vidéos trending (public)
   */
  async getTrendingVideosPublic(
    category?: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<number[]> {
    try {
      logger.info('Getting trending videos', { category, limit, offset });
      const db = await getDb();
      if (!db) return [];

      const videos = await db.query.videos.findMany({
        orderBy: (v, { desc }) => [desc(v.views)],
        limit,
        offset,
      });

      return videos.map(v => v.id);
    } catch (error) {
      logger.error('Failed to get trending videos', { error });
      return [];
    }
  }

  /**
   * Obtenir les vidéos découverte
   */
  async getDiscoveryVideos(limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      logger.info('Getting discovery videos', { limit, offset });
      return await this.getDefaultFeed(limit, offset);
    } catch (error) {
      logger.error('Failed to get discovery videos', { error });
      return [];
    }
  }

  /**
   * Obtenir les vidéos suivis
   */
  async getFollowingFeed(userId: number, limit: number = 20, offset: number = 0): Promise<number[]> {
    try {
      logger.info('Getting following feed', { userId, limit, offset });
      
      const userProfile = await this.getUserProfile(userId);
      if (!userProfile || userProfile.followingIds.length === 0) {
        return [];
      }

      const videos = await this.getFollowingVideos(userProfile.followingIds, limit);
      return videos.map(v => v.id);
    } catch (error) {
      logger.error('Failed to get following feed', { error });
      return [];
    }
  }
}

/**
 * Instance singleton
 */
let recommendationEngine: RecommendationEngine | null = null;

/**
 * Obtenir l'instance RecommendationEngine
 */
export function getRecommendationEngine(): RecommendationEngine {
  if (!recommendationEngine) {
    recommendationEngine = new RecommendationEngine();
  }
  return recommendationEngine;
}
