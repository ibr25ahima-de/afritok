/**
 * Creator Rewards Program - Paiement par vues
 * 
 * Gère :
 * - Paiement automatique des créateurs basé sur les vues
 * - Calcul des revenus selon le CPM (Cost Per Mille)
 * - Suivi des vues par vidéo et créateur
 * - Historique des paiements
 * - Seuil minimum de paiement
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Configuration du CPM par région
 */
const CPM_BY_REGION: Record<string, number> = {
  'US': 6.50,    // TikTok 4.00 -> Afritok 6.50 +62%
  'CA': 6.00,    // TikTok 3.50 -> Afritok 6.00 +71%
  'GB': 5.50,    // TikTok 3.25 -> Afritok 5.50 +69%
  'AU': 5.25,    // TikTok 3.00 -> Afritok 5.25 +75%
  'DE': 4.75,    // TikTok 2.50 -> Afritok 4.75 +90%
  'FR': 4.75,    // TikTok 2.25 -> Afritok 4.75 +111%
  'JP': 6.00,    // TikTok 2.00 -> Afritok 6.00 +200%
  'IN': 2.50,    // TikTok 0.50 -> Afritok 2.50 +400%
  'BR': 3.00,    // TikTok 0.75 -> Afritok 3.00 +300%
  'MX': 3.25,    // TikTok 0.80 -> Afritok 3.25 +306%
  'ZA': 3.25,    // TikTok 0.70 -> Afritok 3.25 +364%
  'NG': 3.00,    // TikTok 0.60 -> Afritok 3.00 +400%
  'KE': 3.00,    // TikTok 0.65 -> Afritok 3.00 +362%
  'GH': 3.00,    // TikTok 0.60 -> Afritok 3.00 +400%
  'EG': 2.50,    // TikTok 0.50 -> Afritok 2.50 +400%
  'DEFAULT': 3.50, // TikTok 1.00 -> Afritok 3.50 +250%
};

/**
 * Seuil minimum de paiement (en cents)
 */
const MINIMUM_PAYOUT_THRESHOLD = 10000; // $100

/**
 * Interface pour un paiement de créateur
 */
export interface CreatorRewardPayment {
  id: string;
  creatorId: number;
  videoId?: number;
  views: number;
  cpm: number; // Cost Per Mille
  amount: number; // en cents
  currency: string;
  region: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  paymentMethod?: 'stripe' | 'mtn' | 'orange' | 'wave' | 'airtel';
}

/**
 * Interface pour les statistiques de créateur
 */
export interface CreatorStats {
  creatorId: number;
  totalViews: number;
  totalEarnings: number; // en cents
  totalPayments: number;
  pendingBalance: number; // en cents
  lastPaymentDate?: Date;
  averageCPM: number;
}

/**
 * Classe pour gérer le Creator Rewards Program
 */
export class CreatorRewardsProgramManager {
  private payments: Map<string, CreatorRewardPayment> = new Map();
  private creatorStats: Map<number, CreatorStats> = new Map();
  private videoViews: Map<number, number> = new Map(); // videoId -> views

  /**
   * Obtenir le CPM pour une région
   */
  private getCPMForRegion(region: string): number {
    return CPM_BY_REGION[region] || CPM_BY_REGION['DEFAULT'];
  }

  /**
   * Calculer le revenu basé sur les vues
   */
  private calculateRevenueFromViews(views: number, cpm: number): number {
    // CPM est en dollars, views / 1000 = nombre de milliers de vues
    // (views / 1000) * cpm = revenu en dollars
    // * 100 = revenu en cents
    const revenueInDollars = (views / 1000) * cpm;
    return Math.floor(revenueInDollars * 100);
  }

  /**
   * Enregistrer les vues d'une vidéo
   */
  recordVideoView(videoId: number, creatorId: number, region: string = 'DEFAULT'): void {
    // Incrémenter les vues de la vidéo
    const currentViews = this.videoViews.get(videoId) || 0;
    this.videoViews.set(videoId, currentViews + 1);

    // Mettre à jour les statistiques du créateur
    if (!this.creatorStats.has(creatorId)) {
      this.creatorStats.set(creatorId, {
        creatorId,
        totalViews: 0,
        totalEarnings: 0,
        totalPayments: 0,
        pendingBalance: 0,
        averageCPM: this.getCPMForRegion(region),
      });
    }

    const stats = this.creatorStats.get(creatorId)!;
    stats.totalViews += 1;

    logger.debug('Video view recorded', {
      videoId,
      creatorId,
      totalViews: stats.totalViews,
    });
  }

  /**
   * Générer un paiement pour un créateur basé sur les vues
   */
  generatePayment(
    creatorId: number,
    videoId: number,
    views: number,
    region: string = 'DEFAULT',
    currency: string = 'USD'
  ): CreatorRewardPayment | null {
    const cpm = this.getCPMForRegion(region);
    const amount = this.calculateRevenueFromViews(views, cpm);

    if (amount === 0) {
      logger.warn('Payment amount is zero', { creatorId, videoId, views, cpm });
      return null;
    }

    const payment: CreatorRewardPayment = {
      id: `crp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      creatorId,
      videoId,
      views,
      cpm,
      amount,
      currency,
      region,
      status: 'pending',
      createdAt: new Date(),
    };

    this.payments.set(payment.id, payment);

    // Mettre à jour les statistiques
    if (!this.creatorStats.has(creatorId)) {
      this.creatorStats.set(creatorId, {
        creatorId,
        totalViews: 0,
        totalEarnings: 0,
        totalPayments: 0,
        pendingBalance: 0,
        averageCPM: cpm,
      });
    }
    
    const stats = this.creatorStats.get(creatorId)!;
    stats.pendingBalance += amount;
    stats.totalEarnings += amount;

    logger.info('Creator reward payment generated', {
      paymentId: payment.id,
      creatorId,
      videoId,
      views,
      amount,
      cpm,
    });

    return payment;
  }

  /**
   * Obtenir le solde en attente d'un créateur
   */
  getPendingBalance(creatorId: number): number {
    const stats = this.creatorStats.get(creatorId);
    return stats ? stats.pendingBalance : 0;
  }

  /**
   * Vérifier si un créateur a atteint le seuil minimum de paiement
   */
  isEligibleForPayout(creatorId: number): boolean {
    const balance = this.getPendingBalance(creatorId);
    return balance >= MINIMUM_PAYOUT_THRESHOLD;
  }

  /**
   * Traiter un paiement
   */
  processPayment(paymentId: string, paymentMethod: string = 'stripe'): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return false;
    }

    if (payment.status !== 'pending') {
      logger.warn('Payment is not pending', { paymentId, status: payment.status });
      return false;
    }

    payment.status = 'processing';
    payment.paymentMethod = paymentMethod as any;

    logger.info('Payment processing started', {
      paymentId,
      creatorId: payment.creatorId,
      amount: payment.amount,
      paymentMethod,
    });

    return true;
  }

  /**
   * Marquer un paiement comme complété
   */
  completePayment(paymentId: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return false;
    }

    payment.status = 'completed';
    payment.completedAt = new Date();

    // Mettre à jour les statistiques
    const stats = this.creatorStats.get(payment.creatorId);
    if (stats) {
      stats.pendingBalance -= payment.amount;
      stats.totalPayments += 1;
      stats.lastPaymentDate = new Date();
    }

    logger.info('Payment completed', {
      paymentId,
      creatorId: payment.creatorId,
      amount: payment.amount,
    });

    return true;
  }

  /**
   * Marquer un paiement comme échoué
   */
  failPayment(paymentId: string, reason: string): boolean {
    const payment = this.payments.get(paymentId);
    if (!payment) {
      logger.warn('Payment not found', { paymentId });
      return false;
    }

    payment.status = 'failed';

    logger.warn('Payment failed', {
      paymentId,
      creatorId: payment.creatorId,
      reason,
    });

    return true;
  }

  /**
   * Obtenir les statistiques d'un créateur
   */
  getCreatorStats(creatorId: number): CreatorStats | null {
    return this.creatorStats.get(creatorId) || null;
  }

  /**
   * Obtenir les paiements d'un créateur
   */
  getCreatorPayments(creatorId: number, limit: number = 50, offset: number = 0): CreatorRewardPayment[] {
    const payments = Array.from(this.payments.values()).filter((p) => p.creatorId === creatorId);
    return payments.slice(offset, offset + limit);
  }

  /**
   * Obtenir les paiements en attente
   */
  getPendingPayments(): CreatorRewardPayment[] {
    return Array.from(this.payments.values()).filter((p) => p.status === 'pending');
  }

  /**
   * Obtenir les paiements en traitement
   */
  getProcessingPayments(): CreatorRewardPayment[] {
    return Array.from(this.payments.values()).filter((p) => p.status === 'processing');
  }

  /**
   * Obtenir les créateurs éligibles pour un paiement
   */
  getEligibleCreators(): number[] {
    const eligible: number[] = [];
    this.creatorStats.forEach((stats, creatorId) => {
      if (stats.pendingBalance >= MINIMUM_PAYOUT_THRESHOLD) {
        eligible.push(creatorId);
      }
    });
    return eligible;
  }

  /**
   * Obtenir le nombre total de vues d'une vidéo
   */
  getVideoViews(videoId: number): number {
    return this.videoViews.get(videoId) || 0;
  }

  /**
   * Obtenir tous les paiements
   */
  getAllPayments(limit: number = 100, offset: number = 0): CreatorRewardPayment[] {
    const payments = Array.from(this.payments.values());
    return payments.slice(offset, offset + limit);
  }

  /**
   * Obtenir les statistiques de paiement global
   */
  getGlobalStats(): {
    totalPayments: number;
    totalAmount: number;
    totalViews: number;
    averageCPM: number;
  } {
    let totalAmount = 0;
    let totalPayments = 0;
    let totalViews = 0;

    this.payments.forEach((payment) => {
      if (payment.status === 'completed') {
        totalAmount += payment.amount;
        totalPayments += 1;
        totalViews += payment.views;
      }
    });

    const averageCPM = totalViews > 0 ? (totalAmount / (totalViews / 1000)) / 100 : 0;

    return {
      totalPayments,
      totalAmount,
      totalViews,
      averageCPM,
    };
  }

  /**
   * Obtenir le paiement minimum requis
   */
  getMinimumPayoutThreshold(): number {
    return MINIMUM_PAYOUT_THRESHOLD;
  }
}

// Singleton instance
let crpManager: CreatorRewardsProgramManager | null = null;

export function getCreatorRewardsProgramManager(): CreatorRewardsProgramManager {
  if (!crpManager) {
    crpManager = new CreatorRewardsProgramManager();
  }
  return crpManager;
}
