/**
 * Routeurs tRPC pour les abonnements
 */

import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { getSubscriptionsManager } from './subscriptions';
import { z } from 'zod';
import { getLogger } from './logging';

const logger = getLogger();

export const subscriptionsRouter = router({
  /**
   * Obtenir tous les plans d'abonnement
   */
  getPlans: publicProcedure.query(() => {
    const manager = getSubscriptionsManager();
    return manager.getPlans();
  }),

  /**
   * Obtenir un plan par ID
   */
  getPlanById: publicProcedure
    .input(z.object({ planId: z.string() }))
    .query(({ input }) => {
      const manager = getSubscriptionsManager();
      return manager.getPlanById(input.planId);
    }),

  /**
   * Créer un abonnement
   */
  createSubscription: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        planId: z.string(),
        trialDays: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const subscription = await manager.createSubscription(
          ctx.user.id,
          input.customerId,
          input.planId,
          input.trialDays
        );

        if (!subscription) {
          throw new Error('Failed to create subscription');
        }

        logger.info('Subscription created via tRPC', {
          userId: ctx.user.id,
          planId: input.planId,
        });

        return {
          success: true,
          subscription,
        };
      } catch (error) {
        logger.error('Failed to create subscription', { error });
        throw error;
      }
    }),

  /**
   * Obtenir l'abonnement actif
   */
  getActiveSubscription: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const subscription = await manager.getActiveSubscription(input.customerId);

        return subscription;
      } catch (error) {
        logger.error('Failed to get active subscription', { error });
        throw error;
      }
    }),

  /**
   * Vérifier si l'utilisateur a un abonnement actif
   */
  hasActiveSubscription: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const hasActive = await manager.hasActiveSubscription(input.customerId);

        return { hasActive };
      } catch (error) {
        logger.error('Failed to check active subscription', { error });
        throw error;
      }
    }),

  /**
   * Annuler un abonnement
   */
  cancelSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        atPeriodEnd: z.boolean().default(true),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const success = await manager.cancelSubscription(input.subscriptionId, input.atPeriodEnd);

        if (!success) {
          throw new Error('Failed to cancel subscription');
        }

        logger.info('Subscription canceled via tRPC', {
          userId: ctx.user.id,
          subscriptionId: input.subscriptionId,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to cancel subscription', { error });
        throw error;
      }
    }),

  /**
   * Mettre à jour un abonnement
   */
  updateSubscription: protectedProcedure
    .input(
      z.object({
        subscriptionId: z.string(),
        newPlanId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const success = await manager.updateSubscription(input.subscriptionId, input.newPlanId);

        if (!success) {
          throw new Error('Failed to update subscription');
        }

        logger.info('Subscription updated via tRPC', {
          userId: ctx.user.id,
          newPlanId: input.newPlanId,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to update subscription', { error });
        throw error;
      }
    }),

  /**
   * Obtenir l'historique des abonnements
   */
  getSubscriptionHistory: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const history = await manager.getSubscriptionHistory(input.customerId);

        return {
          subscriptions: history,
          count: history.length,
        };
      } catch (error) {
        logger.error('Failed to get subscription history', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les avantages d'un plan
   */
  getPlanFeatures: publicProcedure
    .input(z.object({ planId: z.string() }))
    .query(({ input }) => {
      const manager = getSubscriptionsManager();
      return manager.getPlanFeatures(input.planId);
    }),

  /**
   * Vérifier l'accès à une fonctionnalité
   */
  hasFeatureAccess: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        featureId: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const hasAccess = await manager.hasFeatureAccess(input.customerId, input.featureId);

        return { hasAccess };
      } catch (error) {
        logger.error('Failed to check feature access', { error });
        throw error;
      }
    }),

  /**
   * Obtenir le statut d'un abonnement
   */
  getSubscriptionStatus: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getSubscriptionsManager();
        const status = await manager.getSubscriptionStatus(input.subscriptionId);

        return { status };
      } catch (error) {
        logger.error('Failed to get subscription status', { error });
        throw error;
      }
    }),
});
