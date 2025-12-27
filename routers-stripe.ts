/**
 * Routeurs tRPC pour les paiements Stripe
 */

import { protectedProcedure, publicProcedure, router } from './_core/trpc';
import { getStripePaymentsManager, SUBSCRIPTION_PLANS } from './stripe-payments';
import { z } from 'zod';
import { getLogger } from './logging';

const logger = getLogger();

export const stripeRouter = router({
  /**
   * Créer un client Stripe
   */
  createCustomer: protectedProcedure
    .input(
      z.object({
        email: z.string().email(),
        name: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const customerId = await manager.createCustomer(ctx.user.id, input.email, input.name);

        if (!customerId) {
          throw new Error('Failed to create Stripe customer');
        }

        logger.info('Stripe customer created via tRPC', { userId: ctx.user.id, customerId });
        return { success: true, customerId };
      } catch (error) {
        logger.error('Failed to create customer', { error });
        throw error;
      }
    }),

  /**
   * Créer une intention de paiement
   */
  createPaymentIntent: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        amount: z.number().min(1),
        currency: z.string().default('USD'),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const paymentIntent = await manager.createPaymentIntent(
          input.customerId,
          input.amount,
          input.currency,
          input.description
        );

        if (!paymentIntent) {
          throw new Error('Failed to create payment intent');
        }

        logger.info('Payment intent created via tRPC', {
          userId: ctx.user.id,
          amount: input.amount,
        });

        return {
          success: true,
          clientSecret: paymentIntent.client_secret,
          paymentIntentId: paymentIntent.id,
        };
      } catch (error) {
        logger.error('Failed to create payment intent', { error });
        throw error;
      }
    }),

  /**
   * Créer une session de paiement Checkout
   */
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        items: z.array(
          z.object({
            name: z.string(),
            description: z.string().optional(),
            amount: z.number().min(1),
            currency: z.string().default('USD'),
            quantity: z.number().min(1).default(1),
          })
        ),
        successUrl: z.string().url(),
        cancelUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const session = await manager.createCheckoutSession(
          input.customerId,
          input.items,
          input.successUrl,
          input.cancelUrl
        );

        if (!session) {
          throw new Error('Failed to create checkout session');
        }

        logger.info('Checkout session created via tRPC', {
          userId: ctx.user.id,
          sessionId: session.id,
        });

        return {
          success: true,
          sessionId: session.id,
          url: session.url,
        };
      } catch (error) {
        logger.error('Failed to create checkout session', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les plans d'abonnement
   */
  getSubscriptionPlans: publicProcedure.query(() => {
    return SUBSCRIPTION_PLANS;
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
        const manager = getStripePaymentsManager();
        const subscription = await manager.createSubscription(
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
          subscriptionId: subscription.id,
        });

        return {
          success: true,
          subscriptionId: subscription.id,
          status: subscription.status,
        };
      } catch (error) {
        logger.error('Failed to create subscription', { error });
        throw error;
      }
    }),

  /**
   * Obtenir un abonnement
   */
  getSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const subscription = await manager.getSubscription(input.subscriptionId);

        if (!subscription) {
          throw new Error('Subscription not found');
        }

        return {
          id: subscription.id,
          status: subscription.status,
          planId: subscription.items.data[0]?.price?.product,
          currentPeriodStart: new Date((subscription as any).current_period_start * 1000),
          currentPeriodEnd: new Date((subscription as any).current_period_end * 1000),
          canceledAt: (subscription as any).canceled_at ? new Date((subscription as any).canceled_at * 1000) : null,
        };
      } catch (error) {
        logger.error('Failed to get subscription', { error });
        throw error;
      }
    }),

  /**
   * Annuler un abonnement
   */
  cancelSubscription: protectedProcedure
    .input(z.object({ subscriptionId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const success = await manager.cancelSubscription(input.subscriptionId);

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
   * Obtenir les abonnements d'un client
   */
  getCustomerSubscriptions: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const subscriptions = await manager.getCustomerSubscriptions(input.customerId);

        return subscriptions.map((sub) => ({
          id: sub.id,
          status: sub.status,
          planId: sub.items.data[0]?.price?.product,
          currentPeriodStart: new Date((sub as any).current_period_start * 1000),
          currentPeriodEnd: new Date((sub as any).current_period_end * 1000),
          canceledAt: (sub as any).canceled_at ? new Date((sub as any).canceled_at * 1000) : null,
        }));
      } catch (error) {
        logger.error('Failed to get customer subscriptions', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les factures d'un client
   */
  getCustomerInvoices: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const invoices = await manager.getCustomerInvoices(input.customerId);

        return invoices.map((invoice) => ({
          id: invoice.id,
          amount: (invoice as any).amount_paid,
          currency: invoice.currency,
          status: invoice.status,
          paidAt: (invoice as any).paid_at ? new Date((invoice as any).paid_at * 1000) : null,
          dueDate: (invoice as any).due_date ? new Date((invoice as any).due_date * 1000) : null,
          downloadUrl: invoice.invoice_pdf,
        }));
      } catch (error) {
        logger.error('Failed to get customer invoices', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les paiements d'un client
   */
  getCustomerCharges: protectedProcedure
    .input(z.object({ customerId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const charges = await manager.getCustomerCharges(input.customerId);

        return charges.map((charge) => ({
          id: charge.id,
          amount: charge.amount,
          currency: charge.currency,
          status: charge.status,
          description: charge.description,
          createdAt: new Date((charge as any).created * 1000),
        }));
      } catch (error) {
        logger.error('Failed to get customer charges', { error });
        throw error;
      }
    }),

  /**
   * Mettre à jour la méthode de paiement
   */
  updatePaymentMethod: protectedProcedure
    .input(
      z.object({
        customerId: z.string(),
        paymentMethodId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const success = await manager.updatePaymentMethod(input.customerId, input.paymentMethodId);

        if (!success) {
          throw new Error('Failed to update payment method');
        }

        logger.info('Payment method updated via tRPC', { userId: ctx.user.id });
        return { success: true };
      } catch (error) {
        logger.error('Failed to update payment method', { error });
        throw error;
      }
    }),

  /**
   * Vérifier le statut d'un paiement
   */
  checkPaymentStatus: protectedProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getStripePaymentsManager();
        const status = await manager.checkPaymentStatus(input.paymentIntentId);

        return { status };
      } catch (error) {
        logger.error('Failed to check payment status', { error });
        throw error;
      }
    }),
});
