/**
 * Module de récompenses pour les sessions live
 * 
 * Gère :
 * - Récompenses automatiques basées sur le nombre de participants
 * - Bonus pour l'hôte selon la durée et l'engagement
 * - Historique des récompenses
 * - Paiements automatiques
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Configuration des récompenses par nombre de participants
 */
// AFRITOK PAIE PLUS QUE TIKTOK - Augmentation de 100-200%
const REWARD_TIERS = [
  { minParticipants: 1, maxParticipants: 5, rewardPerParticipant: 250 }, // TikTok 100 -> Afritok 250 +150%
  { minParticipants: 6, maxParticipants: 15, rewardPerParticipant: 350 }, // TikTok 150 -> Afritok 350 +133%
  { minParticipants: 16, maxParticipants: 30, rewardPerParticipant: 450 }, // TikTok 200 -> Afritok 450 +125%
  { minParticipants: 31, maxParticipants: 50, rewardPerParticipant: 550 }, // TikTok 250 -> Afritok 550 +120%
  { minParticipants: 51, maxParticipants: Infinity, rewardPerParticipant: 650 }, // TikTok 300 -> Afritok 650 +117%
];

/**
 * Bonus de durée (en cents par minute)
 */
const DURATION_BONUS_PER_MINUTE = 150; // TikTok 50 -> Afritok 150 +200%

/**
 * Bonus d'engagement (basé sur les cadeaux reçus)
 */
const ENGAGEMENT_BONUS_MULTIPLIER = 0.25; // TikTok 0.1 -> Afritok 0.25 +150%

/**
 * Interface pour une récompense live
 */
export interface LiveReward {
  id: string;
  sessionId: string;
  hostId: number;
  participantCount: number;
  baseReward: number; // en cents
  durationBonus: number; // en cents
  engagementBonus: number; // en cents
  totalReward: number; // en cents
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  reason: string;
}

/**
 * Classe pour gérer les récompenses des lives
 */
export class LiveRewardsManager {
  private rewards: Map<string, LiveReward> = new Map();
  private hostRewardHistory: Map<number, LiveReward[]> = new Map();

  /**
   * Calculer la récompense basée sur le nombre de participants
   */
  private calculateBaseReward(participantCount: number): number {
    const tier = REWARD_TIERS.find(
      (t) => participantCount >= t.minParticipants && participantCount <= t.maxParticipants
    );

    if (!tier) {
      logger.warn('No reward tier found for participant count', { participantCount });
      return 0;
    }

    return tier.rewardPerParticipant * participantCount;
  }

  /**
   * Calculer le bonus de durée
   */
  private calculateDurationBonus(durationMinutes: number): number {
    return Math.floor(durationMinutes * DURATION_BONUS_PER_MINUTE);
  }

  /**
   * Créer une récompense pour une session live
   */
  createReward(
    sessionId: string,
    hostId: number,
    participantCount: number,
    durationMinutes: number = 0,
    giftRevenue: number = 0,
    currency: string = 'USD'
  ): LiveReward {
    const baseReward = this.calculateBaseReward(participantCount);
    const durationBonus = this.calculateDurationBonus(durationMinutes);
    const engagementBonus = Math.floor(giftRevenue * ENGAGEMENT_BONUS_MULTIPLIER);
    const totalReward = baseReward + durationBonus + engagementBonus;

    const reward: LiveReward = {
      id: `reward_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      sessionId,
      hostId,
      participantCount,
      baseReward,
      durationBonus,
      engagementBonus,
      totalReward,
      currency,
      status: 'pending',
      createdAt: new Date(),
      reason: `Live session with ${participantCount} participants`,
    };

    this.rewards.set(reward.id, reward);

    // Ajouter à l'historique de l'hôte
    if (!this.hostRewardHistory.has(hostId)) {
      this.hostRewardHistory.set(hostId, []);
    }
    this.hostRewardHistory.get(hostId)!.push(reward);

    logger.info('Live reward created', {
      rewardId: reward.id,
      hostId,
      sessionId,
      participantCount,
      totalReward,
    });

    return reward;
  }

  /**
   * Obtenir une récompense
   */
  getReward(rewardId: string): LiveReward | undefined {
    return this.rewards.get(rewardId);
  }

  /**
   * Obtenir les récompenses d'un hôte
   */
  getHostRewards(hostId: number, limit: number = 50, offset: number = 0): LiveReward[] {
    const rewards = this.hostRewardHistory.get(hostId) || [];
    return rewards.slice(offset, offset + limit);
  }

  /**
   * Obtenir le total des récompenses d'un hôte
   */
  getTotalHostRewards(hostId: number): number {
    const rewards = this.hostRewardHistory.get(hostId) || [];
    return rewards.reduce((sum, r) => sum + r.totalReward, 0);
  }

  /**
   * Obtenir les récompenses d'une session
   */
  getSessionRewards(sessionId: string): LiveReward[] {
    return Array.from(this.rewards.values()).filter((r) => r.sessionId === sessionId);
  }

  /**
   * Marquer une récompense comme complétée
   */
  completeReward(rewardId: string): boolean {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      logger.warn('Reward not found', { rewardId });
      return false;
    }

    reward.status = 'completed';
    reward.completedAt = new Date();

    logger.info('Live reward completed', {
      rewardId,
      hostId: reward.hostId,
      totalReward: reward.totalReward,
    });

    return true;
  }

  /**
   * Marquer une récompense comme échouée
   */
  failReward(rewardId: string, reason: string): boolean {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      logger.warn('Reward not found', { rewardId });
      return false;
    }

    reward.status = 'failed';
    reward.reason = reason;

    logger.warn('Live reward failed', {
      rewardId,
      hostId: reward.hostId,
      reason,
    });

    return true;
  }

  /**
   * Obtenir les statistiques de récompenses
   */
  getRewardStats(hostId: number): {
    totalRewards: number;
    totalSessions: number;
    averageRewardPerSession: number;
    highestReward: number;
  } {
    const rewards = this.hostRewardHistory.get(hostId) || [];
    const totalRewards = rewards.reduce((sum, r) => sum + r.totalReward, 0);
    const completedRewards = rewards.filter((r) => r.status === 'completed');
    const highestReward = Math.max(...rewards.map((r) => r.totalReward), 0);

    return {
      totalRewards,
      totalSessions: rewards.length,
      averageRewardPerSession: rewards.length > 0 ? Math.floor(totalRewards / rewards.length) : 0,
      highestReward,
    };
  }

  /**
   * Obtenir les récompenses en attente
   */
  getPendingRewards(): LiveReward[] {
    return Array.from(this.rewards.values()).filter((r) => r.status === 'pending');
  }

  /**
   * Obtenir les récompenses en traitement
   */
  getProcessingRewards(): LiveReward[] {
    return Array.from(this.rewards.values()).filter((r) => r.status === 'processing');
  }

  /**
   * Marquer une récompense en traitement
   */
  markAsProcessing(rewardId: string): boolean {
    const reward = this.rewards.get(rewardId);
    if (!reward) {
      logger.warn('Reward not found', { rewardId });
      return false;
    }

    reward.status = 'processing';

    logger.info('Live reward marked as processing', {
      rewardId,
      hostId: reward.hostId,
    });

    return true;
  }

  /**
   * Nettoyer les anciennes récompenses (plus de 30 jours)
   */
  cleanupOldRewards(daysOld: number = 30): number {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    let count = 0;
    const rewardsToDelete: string[] = [];

    this.rewards.forEach((reward, rewardId) => {
      if (reward.createdAt < cutoffDate && reward.status === 'completed') {
        rewardsToDelete.push(rewardId);
        count++;
      }
    });

    rewardsToDelete.forEach((id) => this.rewards.delete(id));

    logger.info('Old rewards cleaned up', { count, daysOld });

    return count;
  }
}

// Singleton instance
let rewardsManager: LiveRewardsManager | null = null;

export function getLiveRewardsManager(): LiveRewardsManager {
  if (!rewardsManager) {
    rewardsManager = new LiveRewardsManager();
  }
  return rewardsManager;
}
