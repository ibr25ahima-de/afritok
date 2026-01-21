/**
 * Module de gestion des paiements ponctuels pour Afritok
 * 
 * Gère :
 * - Paiements pour cadeaux virtuels
 * - Paiements pour tips
 * - Paiements pour produits
 * - Historique des paiements
 * - Remboursements
 */

import { getDb } from './db';
import { getLogger } from './logging';
import { getStripePaymentsManager } from './stripe-payments';
import { eq, and, desc } from 'drizzle-orm';

const logger = getLogger();

/**
 * Interface pour un paiement ponctuel
 */
export interface OneTimePayment {
  id: string;
  userId: number;
  recipientId: number; // Créateur qui reçoit le paiement
  type: 'gift' | 'tip' | 'product';
  amount: number; // en cents
  currency: string;
  description: string;
  paymentIntentId: string;
  status: 'pending' | 'succeeded' | 'failed' | 'refunded';
  metadata?: Record<string, any>;
  createdAt: Date;
  refundedAt?: Date;
}

/**
 * Classe pour gérer les paiements ponctuels
 */
export class OneTimePaymentsManager {
  /**
   * Créer un paiement ponctuel
   */
  async createPayment(
    userId: number,
    recipientId: number,
    type: 'gift' | 'tip' | 'product',
    amount: number,
    currency: string,
    description: string,
    metadata?: Record<string, any>
  ): Promise<string | null> {
    const db = await getDb();
    if (!db) {
      logger.warn('Database not available for payment creation');
      return null;
    }

    try {
      // Créer l'intention de paiement Stripe
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const paymentIntent = await stripeInstance.paymentIntents.create({
        amount,
        currency: currency.toLowerCase(),
        description,
        metadata: {
          userId: userId.toString(),
          recipientId: recipientId.toString(),
          type,
          ...metadata,
        },
      });

      logger.info('One-time payment created', {
        userId,
        recipientId,
        type,
        amount,
        paymentIntentId: paymentIntent.id,
      });

      return paymentIntent.id;
    } catch (error) {
      logger.error('Failed to create one-time payment', { error, userId, recipientId });
      return null;
    }
  }

  /**
   * Confirmer un paiement
   */
  async confirmPayment(paymentIntentId: string): Promise<boolean> {
    try {
      const manager = getStripePaymentsManager();
      const status = await manager.checkPaymentStatus(paymentIntentId);

      if (status === 'succeeded') {
        logger.info('Payment confirmed', { paymentIntentId });
        return true;
      }

      logger.warn('Payment not succeeded', { paymentIntentId, status });
      return false;
    } catch (error) {
      logger.error('Failed to confirm payment', { error, paymentIntentId });
      return false;
    }
  }

  /**
   * Rembourser un paiement
   */
  async refundPayment(paymentIntentId: string, reason?: string): Promise<boolean> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const refund = await stripeInstance.refunds.create({
        payment_intent: paymentIntentId,
        reason: (reason as any) || 'requested_by_customer',
      });

      logger.info('Payment refunded', {
        paymentIntentId,
        refundId: refund.id,
        reason,
      });

      return true;
    } catch (error) {
      logger.error('Failed to refund payment', { error, paymentIntentId });
      return false;
    }
  }

  /**
   * Obtenir l'historique des paiements d'un utilisateur
   */
  async getUserPaymentHistory(
    userId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<OneTimePayment[]> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const charges = await stripeInstance.charges.list({
        limit,
        metadata: { userId: userId.toString() },
      } as any);

      return charges.data.map((charge) => ({
        id: charge.id,
        userId,
        recipientId: parseInt((charge.metadata?.recipientId as string) || '0'),
        type: (charge.metadata?.type as any) || 'product',
        amount: charge.amount,
        currency: charge.currency,
        description: charge.description || '',
        paymentIntentId: charge.payment_intent as string,
        status: charge.status === 'succeeded' ? 'succeeded' : 'failed',
        metadata: charge.metadata,
        createdAt: new Date((charge as any).created * 1000),
      }));
    } catch (error) {
      logger.error('Failed to get user payment history', { error, userId });
      return [];
    }
  }

  /**
   * Obtenir l'historique des paiements reçus par un créateur
   */
  async getCreatorPaymentHistory(
    recipientId: number,
    limit: number = 20,
    offset: number = 0
  ): Promise<OneTimePayment[]> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const charges = await stripeInstance.charges.list({
        limit,
        metadata: { recipientId: recipientId.toString() },
      } as any);

      return charges.data.map((charge) => ({
        id: charge.id,
        userId: parseInt((charge.metadata?.userId as string) || '0'),
        recipientId,
        type: (charge.metadata?.type as any) || 'product',
        amount: charge.amount,
        currency: charge.currency,
        description: charge.description || '',
        paymentIntentId: charge.payment_intent as string,
        status: charge.status === 'succeeded' ? 'succeeded' : 'failed',
        metadata: charge.metadata,
        createdAt: new Date((charge as any).created * 1000),
      }));
    } catch (error) {
      logger.error('Failed to get creator payment history', { error, recipientId });
      return [];
    }
  }

  /**
   * Obtenir les statistiques de paiement d'un créateur
   */
  async getCreatorPaymentStats(recipientId: number) {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const charges = await stripeInstance.charges.list({
        limit: 100,
        metadata: { recipientId: recipientId.toString() },
      } as any);

      const succeededCharges = charges.data.filter((c) => c.status === 'succeeded');
      const totalAmount = succeededCharges.reduce((sum, c) => sum + c.amount, 0);
      const totalCount = succeededCharges.length;

      // Grouper par type
      const byType: Record<string, { count: number; amount: number }> = {};
      succeededCharges.forEach((charge) => {
        const type = (charge.metadata?.type as string) || 'product';
        if (!byType[type]) {
          byType[type] = { count: 0, amount: 0 };
        }
        byType[type].count++;
        byType[type].amount += charge.amount;
      });

      // Grouper par devise
      const byCurrency: Record<string, { count: number; amount: number }> = {};
      succeededCharges.forEach((charge) => {
        const currency = charge.currency.toUpperCase();
        if (!byCurrency[currency]) {
          byCurrency[currency] = { count: 0, amount: 0 };
        }
        byCurrency[currency].count++;
        byCurrency[currency].amount += charge.amount;
      });

      logger.info('Creator payment stats retrieved', {
        recipientId,
        totalAmount,
        totalCount,
      });

      return {
        totalAmount,
        totalCount,
        averageAmount: totalCount > 0 ? totalAmount / totalCount : 0,
        byType,
        byCurrency,
      };
    } catch (error) {
      logger.error('Failed to get creator payment stats', { error, recipientId });
      return {
        totalAmount: 0,
        totalCount: 0,
        averageAmount: 0,
        byType: {},
        byCurrency: {},
      };
    }
  }

  /**
   * Obtenir les paiements par période
   */
  async getPaymentsByPeriod(
    recipientId: number,
    startDate: Date,
    endDate: Date
  ): Promise<OneTimePayment[]> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const charges = await stripeInstance.charges.list({
        limit: 100,
        metadata: { recipientId: recipientId.toString() },
        created: {
          gte: Math.floor(startDate.getTime() / 1000),
          lte: Math.floor(endDate.getTime() / 1000),
        },
      } as any);

      return charges.data.map((charge) => ({
        id: charge.id,
        userId: parseInt((charge.metadata?.userId as string) || '0'),
        recipientId,
        type: (charge.metadata?.type as any) || 'product',
        amount: charge.amount,
        currency: charge.currency,
        description: charge.description || '',
        paymentIntentId: charge.payment_intent as string,
        status: charge.status === 'succeeded' ? 'succeeded' : 'failed',
        metadata: charge.metadata,
        createdAt: new Date((charge as any).created * 1000),
      }));
    } catch (error) {
      logger.error('Failed to get payments by period', { error, recipientId });
      return [];
    }
  }

  /**
   * Obtenir les paiements par type
   */
  async getPaymentsByType(
    recipientId: number,
    type: 'gift' | 'tip' | 'product'
  ): Promise<OneTimePayment[]> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const charges = await stripeInstance.charges.list({
        limit: 100,
        metadata: {
          recipientId: recipientId.toString(),
          type,
        },
      } as any);

      return charges.data.map((charge) => ({
        id: charge.id,
        userId: parseInt((charge.metadata?.userId as string) || '0'),
        recipientId,
        type: (charge.metadata?.type as any) || 'product',
        amount: charge.amount,
        currency: charge.currency,
        description: charge.description || '',
        paymentIntentId: charge.payment_intent as string,
        status: charge.status === 'succeeded' ? 'succeeded' : 'failed',
        metadata: charge.metadata,
        createdAt: new Date((charge as any).created * 1000),
      }));
    } catch (error) {
      logger.error('Failed to get payments by type', { error, recipientId, type });
      return [];
    }
  }

  /**
   * Calculer les revenus nets après frais Stripe
   */
  calculateNetRevenue(grossAmount: number, stripeFeePercentage: number = 2.9): number {
    const stripeFee = Math.round((grossAmount * stripeFeePercentage) / 100) + 30; // 2.9% + $0.30
    return Math.max(0, grossAmount - stripeFee);
  }
}

/**
 * Instance singleton
 */
let manager: OneTimePaymentsManager | null = null;

/**
 * Obtenir l'instance OneTimePaymentsManager
 */
export function getOneTimePaymentsManager(): OneTimePaymentsManager {
  if (!manager) {
    manager = new OneTimePaymentsManager();
  }
  return manager;
}
