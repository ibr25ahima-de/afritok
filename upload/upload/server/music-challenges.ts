/**
 * Music Challenges - Système de challenges basés sur des musiques
 * 
 * Gère :
 * - Création de challenges
 * - Participations aux challenges
 * - Classements et récompenses
 * - Suivi des performances
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour un challenge musical
 */
export interface MusicChallenge {
  id: string;
  creatorId: number; // créateur du challenge
  musicId: string;
  title: string;
  description?: string;
  rules?: string;
  startDate: Date;
  endDate: Date;
  participantCount: number;
  totalViews: number;
  totalEngagement: number;
  prizePool: number; // en cents
  status: 'active' | 'ended' | 'archived';
  featured: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour une participation à un challenge
 */
export interface ChallengeParticipation {
  id: string;
  challengeId: string;
  musicId: string;
  participantId: number;
  videoId: string;
  views: number;
  likes: number;
  comments: number;
  shares: number;
  engagement: number; // score d'engagement
  rank?: number; // classement final
  earnings: number; // en cents
  timestamp: Date;
}

/**
 * Interface pour un classement de challenge
 */
export interface ChallengeLeaderboard {
  challengeId: string;
  participations: {
    participantId: number;
    views: number;
    engagement: number;
    earnings: number;
    rank: number;
  }[];
  totalParticipants: number;
  updatedAt: Date;
}

/**
 * Classe pour gérer les challenges musicaux
 */
export class MusicChallengesManager {
  private challenges: Map<string, MusicChallenge> = new Map();
  private participations: Map<string, ChallengeParticipation> = new Map();
  private leaderboards: Map<string, ChallengeLeaderboard> = new Map();
  private creatorChallenges: Map<number, string[]> = new Map(); // creatorId -> challengeIds
  private musicChallenges: Map<string, string[]> = new Map(); // musicId -> challengeIds
  private participantChallenges: Map<number, string[]> = new Map(); // participantId -> participationIds

  /**
   * Créer un challenge
   */
  createChallenge(
    creatorId: number,
    musicId: string,
    title: string,
    endDate: Date,
    prizePool: number = 0,
    description?: string,
    rules?: string
  ): MusicChallenge {
    const challengeId = `chall_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const challenge: MusicChallenge = {
      id: challengeId,
      creatorId,
      musicId,
      title,
      description,
      rules,
      startDate: new Date(),
      endDate,
      participantCount: 0,
      totalViews: 0,
      totalEngagement: 0,
      prizePool,
      status: 'active',
      featured: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.challenges.set(challengeId, challenge);

    if (!this.creatorChallenges.has(creatorId)) {
      this.creatorChallenges.set(creatorId, []);
    }
    this.creatorChallenges.get(creatorId)!.push(challengeId);

    if (!this.musicChallenges.has(musicId)) {
      this.musicChallenges.set(musicId, []);
    }
    this.musicChallenges.get(musicId)!.push(challengeId);

    // Créer un leaderboard
    this.leaderboards.set(challengeId, {
      challengeId,
      participations: [],
      totalParticipants: 0,
      updatedAt: new Date(),
    });

    logger.info('Music challenge created', {
      challengeId,
      creatorId,
      musicId,
      title,
    });

    return challenge;
  }

  /**
   * Obtenir un challenge
   */
  getChallenge(challengeId: string): MusicChallenge | undefined {
    return this.challenges.get(challengeId);
  }

  /**
   * Obtenir les challenges d'un créateur
   */
  getCreatorChallenges(creatorId: number): MusicChallenge[] {
    const challengeIds = this.creatorChallenges.get(creatorId) || [];
    return challengeIds
      .map((id) => this.challenges.get(id))
      .filter((c) => c !== undefined) as MusicChallenge[];
  }

  /**
   * Obtenir les challenges d'une musique
   */
  getMusicChallenges(musicId: string): MusicChallenge[] {
    const challengeIds = this.musicChallenges.get(musicId) || [];
    return challengeIds
      .map((id) => this.challenges.get(id))
      .filter((c) => c !== undefined) as MusicChallenge[];
  }

  /**
   * Participer à un challenge
   */
  participateInChallenge(
    challengeId: string,
    participantId: number,
    videoId: string
  ): ChallengeParticipation | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      logger.warn('Challenge not found', { challengeId });
      return null;
    }

    if (challenge.status !== 'active') {
      logger.warn('Challenge is not active', { challengeId, status: challenge.status });
      return null;
    }

    if (new Date() > challenge.endDate) {
      challenge.status = 'ended';
      logger.warn('Challenge has ended', { challengeId });
      return null;
    }

    const participationId = `part_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const participation: ChallengeParticipation = {
      id: participationId,
      challengeId,
      musicId: challenge.musicId,
      participantId,
      videoId,
      views: 0,
      likes: 0,
      comments: 0,
      shares: 0,
      engagement: 0,
      earnings: 0,
      timestamp: new Date(),
    };

    this.participations.set(participationId, participation);

    if (!this.participantChallenges.has(participantId)) {
      this.participantChallenges.set(participantId, []);
    }
    this.participantChallenges.get(participantId)!.push(participationId);

    // Incrémenter le compteur de participants
    challenge.participantCount += 1;
    challenge.updatedAt = new Date();

    logger.info('Challenge participation created', {
      participationId,
      challengeId,
      participantId,
      videoId,
    });

    return participation;
  }

  /**
   * Obtenir une participation
   */
  getParticipation(participationId: string): ChallengeParticipation | undefined {
    return this.participations.get(participationId);
  }

  /**
   * Obtenir les participations d'un challenge
   */
  getChallengeParticipations(challengeId: string): ChallengeParticipation[] {
    return Array.from(this.participations.values()).filter(
      (p) => p.challengeId === challengeId
    );
  }

  /**
   * Obtenir les participations d'un participant
   */
  getParticipantParticipations(participantId: number): ChallengeParticipation[] {
    const participationIds = this.participantChallenges.get(participantId) || [];
    return participationIds
      .map((id) => this.participations.get(id))
      .filter((p) => p !== undefined) as ChallengeParticipation[];
  }

  /**
   * Enregistrer les engagements (vues, likes, etc.)
   */
  recordEngagement(
    participationId: string,
    views: number,
    likes: number,
    comments: number,
    shares: number
  ): boolean {
    const participation = this.participations.get(participationId);
    if (!participation) {
      logger.warn('Participation not found', { participationId });
      return false;
    }

    participation.views += views;
    participation.likes += likes;
    participation.comments += comments;
    participation.shares += shares;

    // Calculer le score d'engagement
    participation.engagement = Math.floor(
      views * 0.1 + likes * 0.5 + comments * 1 + shares * 2
    );

    // Mettre à jour le challenge
    const challenge = this.challenges.get(participation.challengeId);
    if (challenge) {
      challenge.totalViews += views;
      challenge.totalEngagement += participation.engagement;
      challenge.updatedAt = new Date();
    }

    logger.info('Engagement recorded', {
      participationId,
      views,
      likes,
      engagement: participation.engagement,
    });

    return true;
  }

  /**
   * Calculer et mettre à jour le leaderboard
   */
  updateLeaderboard(challengeId: string): ChallengeLeaderboard | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      logger.warn('Challenge not found', { challengeId });
      return null;
    }

    const participations = this.getChallengeParticipations(challengeId);

    // Trier par engagement
    const sorted = participations
      .sort((a, b) => b.engagement - a.engagement)
      .map((p, index) => ({
        participantId: p.participantId,
        views: p.views,
        engagement: p.engagement,
        earnings: p.earnings,
        rank: index + 1,
      }));

    const leaderboard: ChallengeLeaderboard = {
      challengeId,
      participations: sorted,
      totalParticipants: participations.length,
      updatedAt: new Date(),
    };

    this.leaderboards.set(challengeId, leaderboard);

    // Mettre à jour les rangs dans les participations
    sorted.forEach((item) => {
      const participation = participations.find((p) => p.participantId === item.participantId);
      if (participation) {
        participation.rank = item.rank;
      }
    });

    logger.info('Leaderboard updated', {
      challengeId,
      totalParticipants: sorted.length,
    });

    return leaderboard;
  }

  /**
   * Obtenir le leaderboard d'un challenge
   */
  getLeaderboard(challengeId: string): ChallengeLeaderboard | undefined {
    return this.leaderboards.get(challengeId);
  }

  /**
   * Terminer un challenge
   */
  endChallenge(challengeId: string): boolean {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      logger.warn('Challenge not found', { challengeId });
      return false;
    }

    challenge.status = 'ended';
    challenge.updatedAt = new Date();

    // Mettre à jour le leaderboard final
    this.updateLeaderboard(challengeId);

    logger.info('Challenge ended', {
      challengeId,
      title: challenge.title,
      participants: challenge.participantCount,
    });

    return true;
  }

  /**
   * Obtenir les challenges populaires
   */
  getPopularChallenges(limit: number = 10): MusicChallenge[] {
    return Array.from(this.challenges.values())
      .filter((c) => c.status === 'active')
      .sort((a, b) => b.participantCount - a.participantCount)
      .slice(0, limit);
  }

  /**
   * Obtenir les challenges en tendance
   */
  getTrendingChallenges(limit: number = 10): MusicChallenge[] {
    return Array.from(this.challenges.values())
      .filter((c) => c.status === 'active')
      .sort((a, b) => b.totalViews - a.totalViews)
      .slice(0, limit);
  }

  /**
   * Obtenir les statistiques d'un challenge
   */
  getChallengeStats(challengeId: string): {
    totalParticipants: number;
    totalViews: number;
    totalEngagement: number;
    averageViews: number;
    averageEngagement: number;
  } | null {
    const challenge = this.challenges.get(challengeId);
    if (!challenge) {
      return null;
    }

    const participations = this.getChallengeParticipations(challengeId);

    const averageViews = participations.length > 0
      ? Math.floor(participations.reduce((sum, p) => sum + p.views, 0) / participations.length)
      : 0;

    const averageEngagement = participations.length > 0
      ? Math.floor(
          participations.reduce((sum, p) => sum + p.engagement, 0) / participations.length
        )
      : 0;

    return {
      totalParticipants: challenge.participantCount,
      totalViews: challenge.totalViews,
      totalEngagement: challenge.totalEngagement,
      averageViews,
      averageEngagement,
    };
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): {
    totalChallenges: number;
    activeChallenges: number;
    totalParticipations: number;
    totalViews: number;
  } {
    const challenges = Array.from(this.challenges.values());
    const activeChallenges = challenges.filter((c) => c.status === 'active').length;
    let totalViews = 0;

    challenges.forEach((c) => {
      totalViews += c.totalViews;
    });

    return {
      totalChallenges: challenges.length,
      activeChallenges,
      totalParticipations: this.participations.size,
      totalViews,
    };
  }
}

// Singleton instance
let challengesManager: MusicChallengesManager | null = null;

export function getMusicChallengesManager(): MusicChallengesManager {
  if (!challengesManager) {
    challengesManager = new MusicChallengesManager();
  }
  return challengesManager;
}
