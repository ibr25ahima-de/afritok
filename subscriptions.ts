/**
 * Module de gestion des abonnements pour Afritok
 * 
 * Gère :
 * - Plans d'abonnement
 * - Création d'abonnements
 * - Renouvellement automatique
 * - Annulation d'abonnements
 * - Historique des abonnements
 * - Avantages des abonnements
 */

import { getLogger } from './logging';
import { getStripePaymentsManager } from './stripe-payments';

const logger = getLogger();

/**
 * Interface pour un plan d'abonnement
 */
export interface SubscriptionPlan {
  id: string;
  name: string;
  description: string;
  price: number; // en cents
  currency: string;
  interval: 'month' | 'year';
  trialDays?: number;
  features: string[];
  stripePriceId?: string;
  stripePlanId?: string;
  isPopular?: boolean;
}

/**
 * Interface pour un abonnement utilisateur
 */
export interface UserSubscription {
  id: string;
  userId: number;
  planId: string;
  stripeSubscriptionId: string;
  status: 'active' | 'past_due' | 'canceled' | 'unpaid' | 'trialing';
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  canceledAt?: Date;
  trialEndsAt?: Date;
  createdAt: Date;
}

/**
 * Plans d'abonnement disponibles
 */
export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: 'creator-basic',
    name: 'Creator Basic',
    description: 'Parfait pour débuter',
    price: 999, // $9.99
    currency: 'USD',
    interval: 'month',
    trialDays: 7,
    features: [
      'Accès aux analytics basiques',
      'Jusqu\'à 10 vidéos en direct par mois',
      'Support par email',
      'Monétisation standard',
    ],
    isPopular: false,
  },
  {
    id: 'creator-pro',
    name: 'Creator Pro',
    description: 'Pour les créateurs actifs',
    price: 2499, // $24.99
    currency: 'USD',
    interval: 'month',
    trialDays: 14,
    features: [
      'Analytics avancées',
      'Jusqu\'à 50 vidéos en direct par mois',
      'Support prioritaire',
      'Monétisation premium (80/20)',
      'Accès aux filtres AR exclusifs',
      'Statistiques détaillées par vidéo',
      'Outils de planification',
    ],
    isPopular: true,
  },
  {
    id: 'creator-pro-annual',
    name: 'Creator Pro (Annuel)',
    description: 'Économisez 17% avec l\'abonnement annuel',
    price: 24999, // $249.99
    currency: 'USD',
    interval: 'year',
    trialDays: 30,
    features: [
      'Tous les avantages Creator Pro',
      'Économies de 17%',
      'Priorité support 24/7',
      'Accès anticipé aux nouvelles fonctionnalités',
      'Badge créateur premium',
    ],
    isPopular: false,
  },
  {
    id: 'creator-elite',
    name: 'Creator Elite',
    description: 'Pour les créateurs de haut niveau',
    price: 4999, // $49.99
    currency: 'USD',
    interval: 'month',
    trialDays: 14,
    features: [
      'Tous les avantages Creator Pro',
      'Vidéos en direct illimitées',
      'Support VIP 24/7',
      'Monétisation ultra-premium (90/10)',
      'Filtres AR personnalisés',
      'API d\'intégration',
      'Gestionnaire de compte dédié',
      'Accès aux événements exclusifs',
    ],
    isPopular: false,
  },
];

/**
 * Classe pour gérer les abonnements
 */
export class SubscriptionsManager {
  /**
   * Obtenir tous les plans d'abonnement
   */
  getPlans(): SubscriptionPlan[] {
    return SUBSCRIPTION_PLANS;
  }

  /**
   * Obtenir un plan par ID
   */
  getPlanById(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS.find((p) => p.id === planId) || null;
  }

  /**
   * Créer un abonnement
   */
  async createSubscription(
    userId: number,
    customerId: string,
    planId: string,
    trialDays?: number
  ): Promise<UserSubscription | null> {
    try {
      const plan = this.getPlanById(planId);
      if (!plan) {
        logger.error('Plan not found', { planId });
        return null;
      }

      const manager = getStripePaymentsManager();
      const subscription = await manager.createSubscription(customerId, planId, trialDays);

      if (!subscription) {
        logger.error('Failed to create Stripe subscription', { planId });
        return null;
      }

      logger.info('Subscription created', {
        userId,
        planId,
        subscriptionId: subscription.id,
      });

      return {
        id: subscription.id,
        userId,
        planId,
        stripeSubscriptionId: subscription.id,
        status: (subscription.status as any) || 'active',
        currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to create subscription', { error, userId, planId });
      return null;
    }
  }

  /**
   * Obtenir l'abonnement actif d'un utilisateur
   */
  async getActiveSubscription(customerId: string): Promise<UserSubscription | null> {
    try {
      const manager = getStripePaymentsManager();
      const subscriptions = await manager.getCustomerSubscriptions(customerId);

      if (subscriptions.length === 0) {
        return null;
      }

      const activeSubscription = subscriptions.find(
        (sub) => sub.status === 'active' || sub.status === 'trialing'
      );

      if (!activeSubscription) {
        return null;
      }

      return {
        id: activeSubscription.id,
        userId: 0, // À remplir depuis la base de données
        planId: '', // À remplir depuis la base de données
        stripeSubscriptionId: activeSubscription.id,
        status: (activeSubscription.status as any) || 'active',
        currentPeriodStart: new Date((activeSubscription as any).current_period_start * 1000),
        currentPeriodEnd: new Date((activeSubscription as any).current_period_end * 1000),
        createdAt: new Date(),
      };
    } catch (error) {
      logger.error('Failed to get active subscription', { error });
      return null;
    }
  }

  /**
   * Annuler un abonnement
   */
  async cancelSubscription(subscriptionId: string, atPeriodEnd: boolean = true): Promise<boolean> {
    try {
      const manager = getStripePaymentsManager();

      if (atPeriodEnd) {
        // Annuler à la fin de la période
        const success = await manager.cancelSubscription(subscriptionId);
        if (success) {
          logger.info('Subscription canceled at period end', { subscriptionId });
          return true;
        }
      } else {
        // Annuler immédiatement
        const success = await manager.cancelSubscription(subscriptionId);
        if (success) {
          logger.info('Subscription canceled immediately', { subscriptionId });
          return true;
        }
      }

      return false;
    } catch (error) {
      logger.error('Failed to cancel subscription', { error, subscriptionId });
      return false;
    }
  }

  /**
   * Mettre à jour un abonnement vers un autre plan
   */
  async updateSubscription(subscriptionId: string, newPlanId: string): Promise<boolean> {
    try {
      const plan = this.getPlanById(newPlanId);
      if (!plan) {
        logger.error('Plan not found', { newPlanId });
        return false;
      }

      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      // Récupérer l'abonnement actuel
      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);

      if (!subscription) {
        logger.error('Subscription not found', { subscriptionId });
        return false;
      }

      // Mettre à jour l'abonnement
      const updatedSubscription = await stripeInstance.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: plan.stripePriceId,
          },
        ],
        proration_behavior: 'create_prorations',
      } as any);

      logger.info('Subscription updated', {
        subscriptionId,
        newPlanId,
      });

      return true;
    } catch (error) {
      logger.error('Failed to update subscription', { error, subscriptionId });
      return false;
    }
  }

  /**
   * Obtenir l'historique des abonnements d'un utilisateur
   */
  async getSubscriptionHistory(customerId: string): Promise<UserSubscription[]> {
    try {
      const manager = getStripePaymentsManager();
      const subscriptions = await manager.getCustomerSubscriptions(customerId);

      return subscriptions.map((sub) => ({
        id: sub.id,
        userId: 0,
        planId: '',
        stripeSubscriptionId: sub.id,
        status: (sub.status as any) || 'active',
        currentPeriodStart: new Date((sub as any).current_period_start * 1000),
        currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
        canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : undefined,
        createdAt: new Date(),
      }));
    } catch (error) {
      logger.error('Failed to get subscription history', { error });
      return [];
    }
  }

  /**
   * Vérifier si un utilisateur a un abonnement actif
   */
  async hasActiveSubscription(customerId: string): Promise<boolean> {
    try {
      const activeSubscription = await this.getActiveSubscription(customerId);
      return activeSubscription !== null;
    } catch (error) {
      logger.error('Failed to check active subscription', { error });
      return false;
    }
  }

  /**
   * Obtenir les avantages d'un plan
   */
  getPlanFeatures(planId: string): string[] {
    const plan = this.getPlanById(planId);
    return plan ? plan.features : [];
  }

  /**
   * Vérifier si un utilisateur a accès à une fonctionnalité
   */
  async hasFeatureAccess(customerId: string, featureId: string): Promise<boolean> {
    try {
      const subscription = await this.getActiveSubscription(customerId);
      if (!subscription) {
        return false;
      }

      const plan = this.getPlanById(subscription.planId);
      if (!plan) {
        return false;
      }

      // Mapping des fonctionnalités par plan
      const featureMap: Record<string, string[]> = {
        'creator-basic': ['basic-analytics', 'standard-monetization'],
        'creator-pro': [
          'advanced-analytics',
          'premium-monetization',
          'exclusive-ar-filters',
          'detailed-stats',
          'scheduling-tools',
        ],
        'creator-pro-annual': [
          'advanced-analytics',
          'premium-monetization',
          'exclusive-ar-filters',
          'detailed-stats',
          'scheduling-tools',
          'early-access',
          'premium-badge',
        ],
        'creator-elite': [
          'advanced-analytics',
          'ultra-premium-monetization',
          'exclusive-ar-filters',
          'detailed-stats',
          'scheduling-tools',
          'custom-ar-filters',
          'api-access',
          'dedicated-manager',
          'exclusive-events',
        ],
      };

      const planFeatures = featureMap[subscription.planId] || [];
      return planFeatures.includes(featureId);
    } catch (error) {
      logger.error('Failed to check feature access', { error });
      return false;
    }
  }

  /**
   * Obtenir le statut d'un abonnement
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<string | null> {
    try {
      const manager = getStripePaymentsManager();
      const stripeInstance = manager.getStripeInstance();

      const subscription = await stripeInstance.subscriptions.retrieve(subscriptionId);
      return subscription.status;
    } catch (error) {
      logger.error('Failed to get subscription status', { error });
      return null;
    }
  }
}

/**
 * Instance singleton
 */
let manager: SubscriptionsManager | null = null;

/**
 * Obtenir l'instance SubscriptionsManager
 */
export function getSubscriptionsManager(): SubscriptionsManager {
  if (!manager) {
    manager = new SubscriptionsManager();
  }
  return manager;
}
