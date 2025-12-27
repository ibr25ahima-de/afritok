/**
 * Routeurs tRPC pour les paiements ponctuels
 */

import { protectedProcedure, router } from './_core/trpc';
import { getOneTimePaymentsManager } from './one-time-payments';
import { z } from 'zod';
import { getLogger } from './logging';

const logger = getLogger();

export const oneTimePaymentsRouter = router({
  /**
   * Créer un paiement ponctuel
   */
  createPayment: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().min(1),
        type: z.string(),
        amount: z.number().min(1),
        currency: z.string().default('USD'),
        description: z.string(),
        metadata: z.record(z.string(), z.any()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const paymentIntentId = await manager.createPayment(
          ctx.user.id,
          input.recipientId,
          input.type as 'gift' | 'tip' | 'product',
          input.amount,
          input.currency,
          input.description,
          input.metadata
        );

        if (!paymentIntentId) {
          throw new Error('Failed to create payment');
        }

        logger.info('Payment created via tRPC', {
          userId: ctx.user.id,
          recipientId: input.recipientId,
          type: input.type,
          amount: input.amount,
        });

        return {
          success: true,
          paymentIntentId,
        };
      } catch (error) {
        logger.error('Failed to create payment', { error });
        throw error;
      }
    }),

  /**
   * Confirmer un paiement
   */
  confirmPayment: protectedProcedure
    .input(z.object({ paymentIntentId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const success = await manager.confirmPayment(input.paymentIntentId);

        if (!success) {
          throw new Error('Payment confirmation failed');
        }

        logger.info('Payment confirmed via tRPC', {
          userId: ctx.user.id,
          paymentIntentId: input.paymentIntentId,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to confirm payment', { error });
        throw error;
      }
    }),

  /**
   * Rembourser un paiement
   */
  refundPayment: protectedProcedure
    .input(
      z.object({
        paymentIntentId: z.string(),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const success = await manager.refundPayment(input.paymentIntentId, input.reason);

        if (!success) {
          throw new Error('Refund failed');
        }

        logger.info('Payment refunded via tRPC', {
          userId: ctx.user.id,
          paymentIntentId: input.paymentIntentId,
        });

        return { success: true };
      } catch (error) {
        logger.error('Failed to refund payment', { error });
        throw error;
      }
    }),

  /**
   * Obtenir l'historique des paiements de l'utilisateur
   */
  getUserPaymentHistory: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const payments = await manager.getUserPaymentHistory(ctx.user.id, input.limit, input.offset);

        return {
          payments,
          count: payments.length,
        };
      } catch (error) {
        logger.error('Failed to get user payment history', { error });
        throw error;
      }
    }),

  /**
   * Obtenir l'historique des paiements reçus par un créateur
   */
  getCreatorPaymentHistory: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().min(1),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const payments = await manager.getCreatorPaymentHistory(
          input.recipientId,
          input.limit,
          input.offset
        );

        return {
          payments,
          count: payments.length,
        };
      } catch (error) {
        logger.error('Failed to get creator payment history', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les statistiques de paiement d'un créateur
   */
  getCreatorPaymentStats: protectedProcedure
    .input(z.object({ recipientId: z.number().min(1) }))
    .query(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const stats = await manager.getCreatorPaymentStats(input.recipientId);

        return stats;
      } catch (error) {
        logger.error('Failed to get creator payment stats', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les paiements par période
   */
  getPaymentsByPeriod: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().min(1),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const payments = await manager.getPaymentsByPeriod(
          input.recipientId,
          input.startDate,
          input.endDate
        );

        return {
          payments,
          count: payments.length,
        };
      } catch (error) {
        logger.error('Failed to get payments by period', { error });
        throw error;
      }
    }),

  /**
   * Obtenir les paiements par type
   */
  getPaymentsByType: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().min(1),
        type: z.string().refine((val) => ['gift', 'tip', 'product'].includes(val)),
      })
    )
    .query(async ({ ctx, input }) => {
      try {
        const manager = getOneTimePaymentsManager();
        const payments = await manager.getPaymentsByType(
          input.recipientId,
          input.type as 'gift' | 'tip' | 'product'
        );

        return {
          payments,
          count: payments.length,
        };
      } catch (error) {
        logger.error('Failed to get payments by type', { error });
        throw error;
      }
    }),

  /**
   * Calculer les revenus nets
   */
  calculateNetRevenue: protectedProcedure
    .input(
      z.object({
        grossAmount: z.number().min(0),
        stripeFeePercentage: z.number().min(0).max(100).default(2.9),
      })
    )
    .query(({ input }) => {
      const manager = getOneTimePaymentsManager();
      const netRevenue = manager.calculateNetRevenue(input.grossAmount, input.stripeFeePercentage);

      return {
        grossAmount: input.grossAmount,
        stripeFeePercentage: input.stripeFeePercentage,
        netRevenue,
        stripeFee: input.grossAmount - netRevenue,
      };
    }),
});
