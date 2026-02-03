/**
 * Music Licensing - Système de licences et droits d'auteur
 * 
 * Gère :
 * - Types de licences
 * - Conditions d'utilisation
 * - Royalties et rémunération
 * - Contrats de licence
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Types de licences disponibles
 */
export type LicenseType = 'free' | 'standard' | 'premium' | 'exclusive';

/**
 * Interface pour une licence de musique
 */
export interface MusicLicense {
  id: string;
  musicId: string;
  artistId: number;
  licenseType: LicenseType;
  royaltyRate: number; // pourcentage (0-100)
  minEarnings: number; // revenu minimum en cents
  maxUses?: number; // nombre maximum d'utilisations (-1 = illimité)
  allowCommercial: boolean;
  allowDerivatives: boolean;
  allowRemix: boolean;
  duration: number; // en jours (-1 = perpétuel)
  price: number; // en cents (0 = gratuit)
  status: 'active' | 'inactive' | 'expired';
  createdAt: Date;
  expiresAt?: Date;
}

/**
 * Interface pour un contrat de licence
 */
export interface LicenseAgreement {
  id: string;
  licenseId: string;
  musicId: string;
  artistId: number;
  creatorId: number;
  agreementType: 'challenge' | 'video' | 'duet' | 'remix' | 'commercial';
  royaltyRate: number;
  startDate: Date;
  endDate?: Date;
  totalEarnings: number; // en cents
  status: 'active' | 'expired' | 'terminated';
  createdAt: Date;
}

/**
 * Interface pour un paiement de royalties
 */
export interface RoyaltyPayment {
  id: string;
  artistId: number;
  musicId: string;
  agreementId: string;
  amount: number; // en cents
  period: string; // "2024-01" format
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Classe pour gérer les licences et droits d'auteur
 */
export class MusicLicensingManager {
  private licenses: Map<string, MusicLicense> = new Map();
  private agreements: Map<string, LicenseAgreement> = new Map();
  private payments: Map<string, RoyaltyPayment> = new Map();
  private musicLicenses: Map<string, string[]> = new Map(); // musicId -> licenseIds
  private artistAgreements: Map<number, string[]> = new Map(); // artistId -> agreementIds
  private creatorAgreements: Map<number, string[]> = new Map(); // creatorId -> agreementIds
  private artistPayments: Map<number, string[]> = new Map(); // artistId -> paymentIds

  /**
   * Créer une licence pour une musique
   */
  createLicense(
    musicId: string,
    artistId: number,
    licenseType: LicenseType,
    royaltyRate: number,
    allowCommercial: boolean = false,
    allowDerivatives: boolean = false,
    allowRemix: boolean = false,
    price: number = 0,
    duration: number = -1,
    maxUses: number = -1
  ): MusicLicense {
    const licenseId = `lic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const license: MusicLicense = {
      id: licenseId,
      musicId,
      artistId,
      licenseType,
      royaltyRate,
      minEarnings: 0,
      maxUses,
      allowCommercial,
      allowDerivatives,
      allowRemix,
      duration,
      price,
      status: 'active',
      createdAt: new Date(),
      expiresAt: duration > 0 ? new Date(Date.now() + duration * 24 * 60 * 60 * 1000) : undefined,
    };

    this.licenses.set(licenseId, license);

    if (!this.musicLicenses.has(musicId)) {
      this.musicLicenses.set(musicId, []);
    }
    this.musicLicenses.get(musicId)!.push(licenseId);

    logger.info('Music license created', {
      licenseId,
      musicId,
      licenseType,
      royaltyRate,
    });

    return license;
  }

  /**
   * Obtenir une licence
   */
  getLicense(licenseId: string): MusicLicense | undefined {
    return this.licenses.get(licenseId);
  }

  /**
   * Obtenir les licences d'une musique
   */
  getMusicLicenses(musicId: string): MusicLicense[] {
    const licenseIds = this.musicLicenses.get(musicId) || [];
    return licenseIds
      .map((id) => this.licenses.get(id))
      .filter((l) => l !== undefined) as MusicLicense[];
  }

  /**
   * Vérifier si une licence permet une utilisation
   */
  isUsageAllowed(
    licenseId: string,
    usageType: 'challenge' | 'video' | 'duet' | 'remix' | 'commercial'
  ): boolean {
    const license = this.licenses.get(licenseId);
    if (!license || license.status !== 'active') {
      return false;
    }

    // Vérifier l'expiration
    if (license.expiresAt && new Date() > license.expiresAt) {
      license.status = 'expired';
      return false;
    }

    // Vérifier les permissions
    if (usageType === 'commercial' && !license.allowCommercial) {
      return false;
    }
    if ((usageType === 'duet' || usageType === 'remix') && !license.allowDerivatives) {
      return false;
    }
    if (usageType === 'remix' && !license.allowRemix) {
      return false;
    }

    return true;
  }

  /**
   * Créer un contrat de licence
   */
  createAgreement(
    licenseId: string,
    musicId: string,
    artistId: number,
    creatorId: number,
    agreementType: 'challenge' | 'video' | 'duet' | 'remix' | 'commercial',
    royaltyRate: number,
    duration: number = 365 // en jours
  ): LicenseAgreement | null {
    const license = this.licenses.get(licenseId);
    if (!license) {
      logger.warn('License not found', { licenseId });
      return null;
    }

    // Vérifier si l'utilisation est autorisée
    if (!this.isUsageAllowed(licenseId, agreementType)) {
      logger.warn('Usage not allowed', { licenseId, agreementType });
      return null;
    }

    const agreementId = `agr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const agreement: LicenseAgreement = {
      id: agreementId,
      licenseId,
      musicId,
      artistId,
      creatorId,
      agreementType,
      royaltyRate,
      startDate: new Date(),
      endDate: new Date(Date.now() + duration * 24 * 60 * 60 * 1000),
      totalEarnings: 0,
      status: 'active',
      createdAt: new Date(),
    };

    this.agreements.set(agreementId, agreement);

    if (!this.artistAgreements.has(artistId)) {
      this.artistAgreements.set(artistId, []);
    }
    this.artistAgreements.get(artistId)!.push(agreementId);

    if (!this.creatorAgreements.has(creatorId)) {
      this.creatorAgreements.set(creatorId, []);
    }
    this.creatorAgreements.get(creatorId)!.push(agreementId);

    logger.info('License agreement created', {
      agreementId,
      licenseId,
      creatorId,
      agreementType,
    });

    return agreement;
  }

  /**
   * Obtenir un contrat
   */
  getAgreement(agreementId: string): LicenseAgreement | undefined {
    return this.agreements.get(agreementId);
  }

  /**
   * Obtenir les contrats d'un artiste
   */
  getArtistAgreements(artistId: number): LicenseAgreement[] {
    const agreementIds = this.artistAgreements.get(artistId) || [];
    return agreementIds
      .map((id) => this.agreements.get(id))
      .filter((a) => a !== undefined) as LicenseAgreement[];
  }

  /**
   * Obtenir les contrats d'un créateur
   */
  getCreatorAgreements(creatorId: number): LicenseAgreement[] {
    const agreementIds = this.creatorAgreements.get(creatorId) || [];
    return agreementIds
      .map((id) => this.agreements.get(id))
      .filter((a) => a !== undefined) as LicenseAgreement[];
  }

  /**
   * Enregistrer les revenus d'un contrat
   */
  recordAgreementEarnings(agreementId: string, earnings: number): boolean {
    const agreement = this.agreements.get(agreementId);
    if (!agreement) {
      logger.warn('Agreement not found', { agreementId });
      return false;
    }

    agreement.totalEarnings += earnings;

    logger.info('Agreement earnings recorded', {
      agreementId,
      earnings,
      totalEarnings: agreement.totalEarnings,
    });

    return true;
  }

  /**
   * Créer un paiement de royalties
   */
  createRoyaltyPayment(
    artistId: number,
    agreementId: string,
    amount: number,
    period: string
  ): RoyaltyPayment | null {
    const agreement = this.agreements.get(agreementId);
    if (!agreement) {
      logger.warn('Agreement not found', { agreementId });
      return null;
    }

    const paymentId = `roy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment: RoyaltyPayment = {
      id: paymentId,
      artistId,
      musicId: agreement.musicId,
      agreementId,
      amount,
      period,
      status: 'pending',
      createdAt: new Date(),
    };

    this.payments.set(paymentId, payment);

    if (!this.artistPayments.has(artistId)) {
      this.artistPayments.set(artistId, []);
    }
    this.artistPayments.get(artistId)!.push(paymentId);

    logger.info('Royalty payment created', {
      paymentId,
      artistId,
      amount,
      period,
    });

    return payment;
  }

  /**
   * Obtenir un paiement de royalties
   */
  getRoyaltyPayment(paymentId: string): RoyaltyPayment | undefined {
    return this.payments.get(paymentId);
  }

  /**
   * Obtenir les paiements d'un artiste
   */
  getArtistPayments(artistId: number): RoyaltyPayment[] {
    const paymentIds = this.artistPayments.get(artistId) || [];
    return paymentIds
      .map((id) => this.payments.get(id))
      .filter((p) => p !== undefined) as RoyaltyPayment[];
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

    logger.info('Royalty payment completed', {
      paymentId,
      artistId: payment.artistId,
      amount: payment.amount,
    });

    return true;
  }

  /**
   * Obtenir les statistiques de licences
   */
  getLicenseStats(): {
    totalLicenses: number;
    totalAgreements: number;
    totalPayments: number;
    totalRoyalties: number;
  } {
    let totalRoyalties = 0;

    this.payments.forEach((payment) => {
      if (payment.status === 'completed') {
        totalRoyalties += payment.amount;
      }
    });

    return {
      totalLicenses: this.licenses.size,
      totalAgreements: this.agreements.size,
      totalPayments: this.payments.size,
      totalRoyalties,
    };
  }
}

// Singleton instance
let licensingManager: MusicLicensingManager | null = null;

export function getMusicLicensingManager(): MusicLicensingManager {
  if (!licensingManager) {
    licensingManager = new MusicLicensingManager();
  }
  return licensingManager;
}
