/**
 * Affiliate Marketing - Commissions
 * 
 * Gère :
 * - Création de liens d'affiliation
 * - Suivi des clics et conversions
 * - Calcul des commissions
 * - Paiements aux affiliés
 * - Rapports de performance
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour un lien d'affiliation
 */
export interface AffiliateLink {
  id: string;
  creatorId: number;
  productId: string;
  productName: string;
  productUrl: string;
  commissionRate: number; // pourcentage (0-100)
  clicks: number;
  conversions: number;
  revenue: number; // en cents
  status: 'active' | 'inactive';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour un clic d'affiliation
 */
export interface AffiliateClick {
  id: string;
  linkId: string;
  creatorId: number;
  visitorId?: string;
  ipAddress?: string;
  userAgent?: string;
  referrer?: string;
  timestamp: Date;
}

/**
 * Interface pour une conversion d'affiliation
 */
export interface AffiliateConversion {
  id: string;
  linkId: string;
  creatorId: number;
  clickId: string;
  productId: string;
  purchaseAmount: number; // en cents
  commissionAmount: number; // en cents
  status: 'pending' | 'confirmed' | 'paid';
  timestamp: Date;
}

/**
 * Interface pour un paiement d'affiliation
 */
export interface AffiliatePayment {
  id: string;
  creatorId: number;
  totalAmount: number; // en cents
  currency: string;
  conversions: string[]; // conversionIds
  status: 'pending' | 'processing' | 'completed' | 'failed';
  paymentMethod?: 'stripe' | 'mtn' | 'orange' | 'wave' | 'airtel';
  createdAt: Date;
  completedAt?: Date;
}

/**
 * Classe pour gérer l'Affiliate Marketing
 */
export class AffiliateMarketingManager {
  private links: Map<string, AffiliateLink> = new Map();
  private clicks: Map<string, AffiliateClick> = new Map();
  private conversions: Map<string, AffiliateConversion> = new Map();
  private payments: Map<string, AffiliatePayment> = new Map();
  private creatorLinks: Map<number, string[]> = new Map(); // creatorId -> linkIds
  private creatorConversions: Map<number, string[]> = new Map(); // creatorId -> conversionIds
  private creatorPayments: Map<number, string[]> = new Map(); // creatorId -> paymentIds

  /**
   * Créer un lien d'affiliation
   */
  createAffiliateLink(
    creatorId: number,
    productId: string,
    productName: string,
    productUrl: string,
    commissionRate: number = 10
  ): AffiliateLink {
    const linkId = `aff_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const link: AffiliateLink = {
      id: linkId,
      creatorId,
      productId,
      productName,
      productUrl,
      commissionRate,
      clicks: 0,
      conversions: 0,
      revenue: 0,
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.links.set(linkId, link);

    // Ajouter à la liste des liens du créateur
    if (!this.creatorLinks.has(creatorId)) {
      this.creatorLinks.set(creatorId, []);
    }
    this.creatorLinks.get(creatorId)!.push(linkId);

    logger.info('Affiliate link created', {
      linkId,
      creatorId,
      productName,
      commissionRate,
    });

    return link;
  }

  /**
   * Obtenir un lien d'affiliation
   */
  getAffiliateLink(linkId: string): AffiliateLink | undefined {
    return this.links.get(linkId);
  }

  /**
   * Obtenir les liens d'affiliation d'un créateur
   */
  getCreatorAffiliateLinks(creatorId: number): AffiliateLink[] {
    const linkIds = this.creatorLinks.get(creatorId) || [];
    return linkIds
      .map((id) => this.links.get(id))
      .filter((l) => l !== undefined) as AffiliateLink[];
  }

  /**
   * Enregistrer un clic sur un lien d'affiliation
   */
  recordClick(
    linkId: string,
    visitorId?: string,
    ipAddress?: string,
    userAgent?: string,
    referrer?: string
  ): AffiliateClick | null {
    const link = this.links.get(linkId);
    if (!link) {
      logger.warn('Affiliate link not found', { linkId });
      return null;
    }

    const clickId = `click_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const click: AffiliateClick = {
      id: clickId,
      linkId,
      creatorId: link.creatorId,
      visitorId,
      ipAddress,
      userAgent,
      referrer,
      timestamp: new Date(),
    };

    this.clicks.set(clickId, click);

    // Incrémenter le compteur de clics
    link.clicks += 1;
    link.updatedAt = new Date();

    logger.info('Affiliate click recorded', {
      clickId,
      linkId,
      creatorId: link.creatorId,
    });

    return click;
  }

  /**
   * Enregistrer une conversion d'affiliation
   */
  recordConversion(
    clickId: string,
    purchaseAmount: number,
    commissionRate?: number
  ): AffiliateConversion | null {
    const click = this.clicks.get(clickId);
    if (!click) {
      logger.warn('Click not found', { clickId });
      return null;
    }

    const link = this.links.get(click.linkId);
    if (!link) {
      logger.warn('Affiliate link not found', { linkId: click.linkId });
      return null;
    }

    const rate = commissionRate ?? link.commissionRate;
    const commissionAmount = Math.floor((purchaseAmount * rate) / 100);

    const conversionId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const conversion: AffiliateConversion = {
      id: conversionId,
      linkId: click.linkId,
      creatorId: link.creatorId,
      clickId,
      productId: link.productId,
      purchaseAmount,
      commissionAmount,
      status: 'pending',
      timestamp: new Date(),
    };

    this.conversions.set(conversionId, conversion);

    // Incrémenter le compteur de conversions
    link.conversions += 1;
    link.revenue += commissionAmount;
    link.updatedAt = new Date();

    // Ajouter à la liste des conversions du créateur
    if (!this.creatorConversions.has(link.creatorId)) {
      this.creatorConversions.set(link.creatorId, []);
    }
    this.creatorConversions.get(link.creatorId)!.push(conversionId);

    logger.info('Affiliate conversion recorded', {
      conversionId,
      linkId: click.linkId,
      creatorId: link.creatorId,
      commission: commissionAmount,
    });

    return conversion;
  }

  /**
   * Confirmer une conversion
   */
  confirmConversion(conversionId: string): boolean {
    const conversion = this.conversions.get(conversionId);
    if (!conversion) {
      logger.warn('Conversion not found', { conversionId });
      return false;
    }

    conversion.status = 'confirmed';

    logger.info('Conversion confirmed', {
      conversionId,
      creatorId: conversion.creatorId,
    });

    return true;
  }

  /**
   * Obtenir les conversions d'un créateur
   */
  getCreatorConversions(creatorId: number): AffiliateConversion[] {
    const conversionIds = this.creatorConversions.get(creatorId) || [];
    return conversionIds
      .map((id) => this.conversions.get(id))
      .filter((c) => c !== undefined) as AffiliateConversion[];
  }

  /**
   * Obtenir les revenus d'affiliation d'un créateur
   */
  getCreatorAffiliateEarnings(creatorId: number): number {
    const conversions = this.getCreatorConversions(creatorId);
    return conversions
      .filter((c) => c.status === 'confirmed' || c.status === 'paid')
      .reduce((sum, c) => sum + c.commissionAmount, 0);
  }

  /**
   * Créer un paiement d'affiliation
   */
  createAffiliatePayment(creatorId: number, currency: string = 'USD'): AffiliatePayment | null {
    const conversions = this.getCreatorConversions(creatorId);
    const pendingConversions = conversions.filter((c) => c.status === 'confirmed');

    if (pendingConversions.length === 0) {
      logger.warn('No pending conversions for creator', { creatorId });
      return null;
    }

    const totalAmount = pendingConversions.reduce((sum, c) => sum + c.commissionAmount, 0);

    const paymentId = `affpay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const payment: AffiliatePayment = {
      id: paymentId,
      creatorId,
      totalAmount,
      currency,
      conversions: pendingConversions.map((c) => c.id),
      status: 'pending',
      createdAt: new Date(),
    };

    this.payments.set(paymentId, payment);

    // Ajouter à la liste des paiements du créateur
    if (!this.creatorPayments.has(creatorId)) {
      this.creatorPayments.set(creatorId, []);
    }
    this.creatorPayments.get(creatorId)!.push(paymentId);

    // Marquer les conversions comme payées
    pendingConversions.forEach((c) => {
      c.status = 'paid';
    });

    logger.info('Affiliate payment created', {
      paymentId,
      creatorId,
      totalAmount,
      conversionCount: pendingConversions.length,
    });

    return payment;
  }

  /**
   * Obtenir les paiements d'un créateur
   */
  getCreatorAffiliatePayments(creatorId: number): AffiliatePayment[] {
    const paymentIds = this.creatorPayments.get(creatorId) || [];
    return paymentIds
      .map((id) => this.payments.get(id))
      .filter((p) => p !== undefined) as AffiliatePayment[];
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

    logger.info('Affiliate payment completed', {
      paymentId,
      creatorId: payment.creatorId,
      amount: payment.totalAmount,
    });

    return true;
  }

  /**
   * Obtenir les statistiques d'affiliation
   */
  getAffiliateStats(): {
    totalLinks: number;
    totalClicks: number;
    totalConversions: number;
    totalRevenue: number;
  } {
    let totalClicks = 0;
    let totalConversions = 0;
    let totalRevenue = 0;

    this.links.forEach((link) => {
      totalClicks += link.clicks;
      totalConversions += link.conversions;
      totalRevenue += link.revenue;
    });

    return {
      totalLinks: this.links.size,
      totalClicks,
      totalConversions,
      totalRevenue,
    };
  }

  /**
   * Obtenir les liens populaires
   */
  getTopAffiliateLinks(limit: number = 10): AffiliateLink[] {
    return Array.from(this.links.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  }
}

// Singleton instance
let affiliateManager: AffiliateMarketingManager | null = null;

export function getAffiliateMarketingManager(): AffiliateMarketingManager {
  if (!affiliateManager) {
    affiliateManager = new AffiliateMarketingManager();
  }
  return affiliateManager;
}
