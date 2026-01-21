/**
 * Module de gestion Stripe pour Afritok
 * 
 * Gère :
 * - Paiements ponctuels (cadeaux, tips)
 * - Abonnements créateur
 * - Facturation
 * - Webhooks
 * - Gestion des clients
 */

import Stripe from 'stripe';
import { getLogger } from './logging';

const logger = getLogger();

// Initialiser Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-10-29.clover' as any,
});

/**
 * Interface pour un paiement
 */
export interface StripePayment {
  id: string;
  userId: number;
  amount: number; // en cents
  currency: string;
  description: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  paymentMethodId?: string;
  invoiceId?: string;
  createdAt: Date;
}

/**
 * Interface pour un abonnement
 */
export interface StripeSubscription {
  id: string;
  userId: number;
  planId: string;
  planName: string;
  amount: number; // en cents
  currency: string;
  interval: 'month' | 'year';
  status: 'active' | 'past_due' | 'canceled' | 'unpaid';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  createdAt: Date;
}

/**
 * Plans d'abonnement disponibles
 */
export const SUBSCRIPTION_PLANS = {
  creator_basic: {
    id: 'creator_basic',
    name: 'Creator Basic',
    description: 'Plan de base pour les créateurs',
    price: 999, // $9.99/mois
    currency: 'USD',
    interval: 'month' as const,
    features: ['Analytics avancées', 'Support prioritaire', 'Pas de limite de vidéos'],
  },
  creator_pro: {
    id: 'creator_pro',
    name: 'Creator Pro',
    description: 'Plan professionnel pour les créateurs',
    price: 2499, // $24.99/mois
    currency: 'USD',
    interval: 'month' as const,
    features: [
      'Tout du plan Basic',
      'Monétisation avancée',
      'API access',
      'Collaborations illimitées',
    ],
  },
  creator_annual: {
    id: 'creator_annual',
    name: 'Creator Pro Annual',
    description: 'Plan annuel pour les créateurs',
    price: 24999, // $249.99/an
    currency: 'USD',
    interval: 'year' as const,
    features: [
      'Tout du plan Pro',
      'Réduction 17%',
      'Support VIP',
      'Features beta access',
    ],
  },
};

/**
 * Classe pour gérer les paiements Stripe
 */
export class StripePaymentsManager {
  /**
   * Créer un client Stripe
   */
  async createCustomer(userId: number, email: string, name?: string): Promise<string | null> {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: { userId: userId.toString() },
      });

      logger.info('Stripe customer created', { userId, customerId: customer.id });
      return customer.id;
    } catch (error) {
      logger.error('Failed to create Stripe customer', { error, userId });
      return null;
    }
  }

  /**
   * Créer une intention de paiement
   */
  async createPaymentIntent(
    customerId: string,
    amount: number,
    currency: string = 'USD',
    description?: string
  ): Promise<Stripe.PaymentIntent | null> {
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        customer: customerId,
        amount,
        currency: currency.toLowerCase(),
        description,
        automatic_payment_methods: {
          enabled: true,
        },
      });

      logger.info('Payment intent created', {
        paymentIntentId: paymentIntent.id,
        amount,
        currency,
      });

      return paymentIntent;
    } catch (error) {
      logger.error('Failed to create payment intent', { error, amount, currency });
      return null;
    }
  }

  /**
   * Créer une session de paiement Stripe Checkout
   */
  async createCheckoutSession(
    customerId: string,
    items: Array<{
      name: string;
      description?: string;
      amount: number; // en cents
      currency: string;
      quantity: number;
    }>,
    successUrl: string,
    cancelUrl: string
  ): Promise<Stripe.Checkout.Session | null> {
    try {
      const lineItems = items.map((item) => ({
        price_data: {
          currency: item.currency.toLowerCase(),
          product_data: {
            name: item.name,
            description: item.description,
          },
          unit_amount: item.amount,
        },
        quantity: item.quantity,
      }));

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        line_items: lineItems as any,
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
      });

      logger.info('Checkout session created', { sessionId: session.id });
      return session;
    } catch (error) {
      logger.error('Failed to create checkout session', { error });
      return null;
    }
  }

  /**
   * Créer un abonnement
   */
  async createSubscription(
    customerId: string,
    planId: string,
    trialDays?: number
  ): Promise<Stripe.Subscription | null> {
    try {
      const plan = SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS];
      if (!plan) {
        logger.warn('Plan not found', { planId });
        return null;
      }

      // Créer ou récupérer le produit Stripe
      const products = await stripe.products.list({
        limit: 1,
      } as any);

      let productId: string;
      if (products.data.length > 0) {
        productId = products.data[0].id;
      } else {
        const product = await stripe.products.create({
          name: plan.name,
          description: plan.description,
          metadata: { planId },
        });
        productId = product.id;
      }

      // Créer ou récupérer le prix
      const prices = await stripe.prices.list({
        product: productId,
        limit: 1,
      });

      let priceId: string;
      if (prices.data.length > 0) {
        priceId = prices.data[0].id;
      } else {
        const price = await stripe.prices.create({
          product: productId,
          unit_amount: plan.price,
          currency: plan.currency.toLowerCase(),
          recurring: {
            interval: plan.interval,
          },
        });
        priceId = price.id;
      }

      // Créer l'abonnement
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        trial_period_days: trialDays,
        payment_behavior: 'default_incomplete',
        expand: ['latest_invoice.payment_intent'],
      });

      logger.info('Subscription created', {
        subscriptionId: subscription.id,
        planId,
        customerId,
      });

      return subscription;
    } catch (error) {
      logger.error('Failed to create subscription', { error, planId });
      return null;
    }
  }

  /**
   * Obtenir un abonnement
   */
  async getSubscription(subscriptionId: string): Promise<Stripe.Subscription | null> {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      return subscription;
    } catch (error) {
      logger.error('Failed to get subscription', { error, subscriptionId });
      return null;
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId: string): Promise<boolean> {
    try {
      await stripe.subscriptions.cancel(subscriptionId);
      logger.info('Subscription canceled', { subscriptionId });
      return true;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      return false;
    }
  }

  /**
   * Obtenir les abonnements d'un client
   */
  async getCustomerSubscriptions(customerId: string): Promise<Stripe.Subscription[]> {
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: customerId,
        limit: 100,
      });

      return subscriptions.data;
    } catch (error) {
      logger.error('Failed to get customer subscriptions', { error, customerId });
      return [];
    }
  }

  /**
   * Obtenir les factures d'un client
   */
  async getCustomerInvoices(customerId: string): Promise<Stripe.Invoice[]> {
    try {
      const invoices = await stripe.invoices.list({
        customer: customerId,
        limit: 100,
      });

      return invoices.data;
    } catch (error) {
      logger.error('Failed to get customer invoices', { error, customerId });
      return [];
    }
  }

  /**
   * Obtenir les paiements d'un client
   */
  async getCustomerCharges(customerId: string): Promise<Stripe.Charge[]> {
    try {
      const charges = await stripe.charges.list({
        customer: customerId,
        limit: 100,
      });

      return charges.data;
    } catch (error) {
      logger.error('Failed to get customer charges', { error, customerId });
      return [];
    }
  }

  /**
   * Mettre à jour les méthodes de paiement d'un client
   */
  async updatePaymentMethod(customerId: string, paymentMethodId: string): Promise<boolean> {
    try {
      await stripe.customers.update(customerId, {
        invoice_settings: {
          default_payment_method: paymentMethodId,
        },
      });

      logger.info('Payment method updated', { customerId });
      return true;
    } catch (error) {
      logger.error('Failed to update payment method', { error, customerId });
      return false;
    }
  }

  /**
   * Obtenir les plans d'abonnement
   */
  getSubscriptionPlans() {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Obtenir un plan d'abonnement
   */
  getSubscriptionPlan(planId: string) {
    return SUBSCRIPTION_PLANS[planId as keyof typeof SUBSCRIPTION_PLANS] || null;
  }

  /**
   * Vérifier le statut d'un paiement
   */
  async checkPaymentStatus(paymentIntentId: string): Promise<string | null> {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return paymentIntent.status;
    } catch (error) {
      logger.error('Failed to check payment status', { error, paymentIntentId });
      return null;
    }
  }

  /**
   * Obtenir l'instance Stripe
   */
  getStripeInstance(): Stripe {
    return stripe;
  }
}

/**
 * Instance singleton
 */
let manager: StripePaymentsManager | null = null;

/**
 * Obtenir l'instance StripePaymentsManager
 */
export function getStripePaymentsManager(): StripePaymentsManager {
  if (!manager) {
    manager = new StripePaymentsManager();
  }
  return manager;
}
