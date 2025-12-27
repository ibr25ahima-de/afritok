/**
 * Music Revenue Sharing - Rémunération double pour artistes et créateurs
 * 
 * Gère :
 * - Calcul des revenus partagés
 * - Distribution des paiements
 * - Suivi des revenus par source
 * - Statistiques de monétisation
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour un paiement partagé
 */
export interface SharedRevenue {
  id: string;
  challengeId: string;
  musicId: string;
  artistId: number;
  creatorId: number;
  participantId: number;
  totalRevenue: number; // en cents
  artistShare: number; // en cents
  creatorShare: number; // en cents
  participantShare: number; // en cents
  artistPercentage: number; // pourcentage
  creatorPercentage: number; // pourcentage
  participantPercentage: number; // pourcentage
  source: 'views' | 'ads' | 'gifts' | 'sponsorship';
  timestamp: Date;
}

/**
 * Interface pour les statistiques de revenus
 */
export interface RevenueStats {
  artistId?: number;
  creatorId?: number;
  participantId?: number;
  totalRevenue: number; // en cents
  artistEarnings: number; // en cents
  creatorEarnings: number; // en cents
  participantEarnings: number; // en cents
  challengeCount: number;
  participationCount: number;
}

/**
 * Classe pour gérer la rémunération partagée
 */
export class MusicRevenueSharingManager {
  private revenues: Map<string, SharedRevenue> = new Map();
  private artistRevenues: Map<number, string[]> = new Map(); // artistId -> revenueIds
  private creatorRevenues: Map<number, string[]> = new Map(); // creatorId -> revenueIds
  private participantRevenues: Map<number, string[]> = new Map(); // participantId -> revenueIds
  private challengeRevenues: Map<string, string[]> = new Map(); // challengeId -> revenueIds

  // Pourcentages de partage par défaut
  private readonly DEFAULT_ARTIST_PERCENTAGE = 40; // 40% pour l'artiste
  private readonly DEFAULT_CREATOR_PERCENTAGE = 40; // 40% pour le créateur du challenge
  private readonly DEFAULT_PARTICIPANT_PERCENTAGE = 20; // 20% pour le participant

  /**
   * Créer un paiement partagé
   */
  createSharedRevenue(
    challengeId: string,
    musicId: string,
    artistId: number,
    creatorId: number,
    participantId: number,
    totalRevenue: number,
    source: 'views' | 'ads' | 'gifts' | 'sponsorship',
    artistPercentage: number = this.DEFAULT_ARTIST_PERCENTAGE,
    creatorPercentage: number = this.DEFAULT_CREATOR_PERCENTAGE,
    participantPercentage: number = this.DEFAULT_PARTICIPANT_PERCENTAGE
  ): SharedRevenue {
    const revenueId = `rev_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Vérifier que les pourcentages totalisent 100%
    const totalPercentage = artistPercentage + creatorPercentage + participantPercentage;
    if (totalPercentage !== 100) {
      logger.warn('Percentages do not total 100%', { totalPercentage });
    }

    const artistShare = Math.floor((totalRevenue * artistPercentage) / 100);
    const creatorShare = Math.floor((totalRevenue * creatorPercentage) / 100);
    const participantShare = totalRevenue - artistShare - creatorShare; // Assurer que le total est correct

    const revenue: SharedRevenue = {
      id: revenueId,
      challengeId,
      musicId,
      artistId,
      creatorId,
      participantId,
      totalRevenue,
      artistShare,
      creatorShare,
      participantShare,
      artistPercentage,
      creatorPercentage,
      participantPercentage,
      source,
      timestamp: new Date(),
    };

    this.revenues.set(revenueId, revenue);

    // Ajouter aux listes
    if (!this.artistRevenues.has(artistId)) {
      this.artistRevenues.set(artistId, []);
    }
    this.artistRevenues.get(artistId)!.push(revenueId);

    if (!this.creatorRevenues.has(creatorId)) {
      this.creatorRevenues.set(creatorId, []);
    }
    this.creatorRevenues.get(creatorId)!.push(revenueId);

    if (!this.participantRevenues.has(participantId)) {
      this.participantRevenues.set(participantId, []);
    }
    this.participantRevenues.get(participantId)!.push(revenueId);

    if (!this.challengeRevenues.has(challengeId)) {
      this.challengeRevenues.set(challengeId, []);
    }
    this.challengeRevenues.get(challengeId)!.push(revenueId);

    logger.info('Shared revenue created', {
      revenueId,
      challengeId,
      totalRevenue,
      artistShare,
      creatorShare,
      participantShare,
    });

    return revenue;
  }

  /**
   * Obtenir un paiement partagé
   */
  getSharedRevenue(revenueId: string): SharedRevenue | undefined {
    return this.revenues.get(revenueId);
  }

  /**
   * Obtenir les revenus d'un artiste
   */
  getArtistRevenues(artistId: number): SharedRevenue[] {
    const revenueIds = this.artistRevenues.get(artistId) || [];
    return revenueIds
      .map((id) => this.revenues.get(id))
      .filter((r) => r !== undefined) as SharedRevenue[];
  }

  /**
   * Obtenir les revenus d'un créateur de challenge
   */
  getCreatorRevenues(creatorId: number): SharedRevenue[] {
    const revenueIds = this.creatorRevenues.get(creatorId) || [];
    return revenueIds
      .map((id) => this.revenues.get(id))
      .filter((r) => r !== undefined) as SharedRevenue[];
  }

  /**
   * Obtenir les revenus d'un participant
   */
  getParticipantRevenues(participantId: number): SharedRevenue[] {
    const revenueIds = this.participantRevenues.get(participantId) || [];
    return revenueIds
      .map((id) => this.revenues.get(id))
      .filter((r) => r !== undefined) as SharedRevenue[];
  }

  /**
   * Obtenir les revenus d'un challenge
   */
  getChallengeRevenues(challengeId: string): SharedRevenue[] {
    const revenueIds = this.challengeRevenues.get(challengeId) || [];
    return revenueIds
      .map((id) => this.revenues.get(id))
      .filter((r) => r !== undefined) as SharedRevenue[];
  }

  /**
   * Obtenir les statistiques de revenus d'un artiste
   */
  getArtistRevenueStats(artistId: number): RevenueStats {
    const revenues = this.getArtistRevenues(artistId);

    const stats: RevenueStats = {
      artistId,
      totalRevenue: 0,
      artistEarnings: 0,
      creatorEarnings: 0,
      participantEarnings: 0,
      challengeCount: new Set(revenues.map((r) => r.challengeId)).size,
      participationCount: revenues.length,
    };

    revenues.forEach((r) => {
      stats.totalRevenue += r.totalRevenue;
      stats.artistEarnings += r.artistShare;
    });

    return stats;
  }

  /**
   * Obtenir les statistiques de revenus d'un créateur de challenge
   */
  getCreatorRevenueStats(creatorId: number): RevenueStats {
    const revenues = this.getCreatorRevenues(creatorId);

    const stats: RevenueStats = {
      creatorId,
      totalRevenue: 0,
      artistEarnings: 0,
      creatorEarnings: 0,
      participantEarnings: 0,
      challengeCount: new Set(revenues.map((r) => r.challengeId)).size,
      participationCount: revenues.length,
    };

    revenues.forEach((r) => {
      stats.totalRevenue += r.totalRevenue;
      stats.creatorEarnings += r.creatorShare;
    });

    return stats;
  }

  /**
   * Obtenir les statistiques de revenus d'un participant
   */
  getParticipantRevenueStats(participantId: number): RevenueStats {
    const revenues = this.getParticipantRevenues(participantId);

    const stats: RevenueStats = {
      participantId,
      totalRevenue: 0,
      artistEarnings: 0,
      creatorEarnings: 0,
      participantEarnings: 0,
      challengeCount: new Set(revenues.map((r) => r.challengeId)).size,
      participationCount: revenues.length,
    };

    revenues.forEach((r) => {
      stats.totalRevenue += r.totalRevenue;
      stats.participantEarnings += r.participantShare;
    });

    return stats;
  }

  /**
   * Obtenir les statistiques de revenus d'un challenge
   */
  getChallengeRevenueStats(challengeId: string): {
    totalRevenue: number;
    artistEarnings: number;
    creatorEarnings: number;
    participantEarnings: number;
    participantCount: number;
  } {
    const revenues = this.getChallengeRevenues(challengeId);

    const stats = {
      totalRevenue: 0,
      artistEarnings: 0,
      creatorEarnings: 0,
      participantEarnings: 0,
      participantCount: new Set(revenues.map((r) => r.participantId)).size,
    };

    revenues.forEach((r) => {
      stats.totalRevenue += r.totalRevenue;
      stats.artistEarnings += r.artistShare;
      stats.creatorEarnings += r.creatorShare;
      stats.participantEarnings += r.participantShare;
    });

    return stats;
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalRevenueStats(): {
    totalRevenue: number;
    totalArtistEarnings: number;
    totalCreatorEarnings: number;
    totalParticipantEarnings: number;
    totalTransactions: number;
    averageTransaction: number;
  } {
    const stats = {
      totalRevenue: 0,
      totalArtistEarnings: 0,
      totalCreatorEarnings: 0,
      totalParticipantEarnings: 0,
      totalTransactions: this.revenues.size,
      averageTransaction: 0,
    };

    this.revenues.forEach((r) => {
      stats.totalRevenue += r.totalRevenue;
      stats.totalArtistEarnings += r.artistShare;
      stats.totalCreatorEarnings += r.creatorShare;
      stats.totalParticipantEarnings += r.participantShare;
    });

    stats.averageTransaction = stats.totalTransactions > 0
      ? Math.floor(stats.totalRevenue / stats.totalTransactions)
      : 0;

    return stats;
  }

  /**
   * Obtenir les top artistes par revenus
   */
  getTopArtistsByRevenue(limit: number = 10): {
    artistId: number;
    totalEarnings: number;
    transactionCount: number;
  }[] {
    const artistStats = new Map<number, { totalEarnings: number; count: number }>();

    this.revenues.forEach((r) => {
      if (!artistStats.has(r.artistId)) {
        artistStats.set(r.artistId, { totalEarnings: 0, count: 0 });
      }
      const stat = artistStats.get(r.artistId)!;
      stat.totalEarnings += r.artistShare;
      stat.count += 1;
    });

    return Array.from(artistStats.entries())
      .map(([artistId, stat]) => ({
        artistId,
        totalEarnings: stat.totalEarnings,
        transactionCount: stat.count,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  /**
   * Obtenir les top créateurs de challenges par revenus
   */
  getTopCreatorsByRevenue(limit: number = 10): {
    creatorId: number;
    totalEarnings: number;
    transactionCount: number;
  }[] {
    const creatorStats = new Map<number, { totalEarnings: number; count: number }>();

    this.revenues.forEach((r) => {
      if (!creatorStats.has(r.creatorId)) {
        creatorStats.set(r.creatorId, { totalEarnings: 0, count: 0 });
      }
      const stat = creatorStats.get(r.creatorId)!;
      stat.totalEarnings += r.creatorShare;
      stat.count += 1;
    });

    return Array.from(creatorStats.entries())
      .map(([creatorId, stat]) => ({
        creatorId,
        totalEarnings: stat.totalEarnings,
        transactionCount: stat.count,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  /**
   * Obtenir les top participants par revenus
   */
  getTopParticipantsByRevenue(limit: number = 10): {
    participantId: number;
    totalEarnings: number;
    transactionCount: number;
  }[] {
    const participantStats = new Map<number, { totalEarnings: number; count: number }>();

    this.revenues.forEach((r) => {
      if (!participantStats.has(r.participantId)) {
        participantStats.set(r.participantId, { totalEarnings: 0, count: 0 });
      }
      const stat = participantStats.get(r.participantId)!;
      stat.totalEarnings += r.participantShare;
      stat.count += 1;
    });

    return Array.from(participantStats.entries())
      .map(([participantId, stat]) => ({
        participantId,
        totalEarnings: stat.totalEarnings,
        transactionCount: stat.count,
      }))
      .sort((a, b) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }
}

// Singleton instance
let revenueSharingManager: MusicRevenueSharingManager | null = null;

export function getMusicRevenueSharingManager(): MusicRevenueSharingManager {
  if (!revenueSharingManager) {
    revenueSharingManager = new MusicRevenueSharingManager();
  }
  return revenueSharingManager;
}
