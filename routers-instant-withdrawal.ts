/**
 * tRPC Routers for Instant Withdrawal
 * Ultra-simple endpoints for withdrawing money instantly
 */

import { z } from 'zod';
import { publicProcedure, router } from './_core/trpc';
import {
  createInstantWithdrawal,
  getWithdrawalHistory,
  getWithdrawalStats,
  INSTANT_PROVIDERS_BY_COUNTRY,
} from './instant-withdrawal';

export const instantWithdrawalRouter = router({
  /**
   * Get available providers for a country
   * GET /api/trpc/instantWithdrawal.getProviders?country=SN
   */
  getProviders: publicProcedure
    .input(z.object({ country: z.string() }))
    .query(({ input }) => {
      const providers = INSTANT_PROVIDERS_BY_COUNTRY[input.country] || [];
      return {
        country: input.country,
        providers,
        available: providers.length > 0,
      };
    }),

  /**
   * Create instant withdrawal
   * POST /api/trpc/instantWithdrawal.withdraw
   * 
   * Body:
   * {
   *   amount: 5.00,
   *   country: "SN",
   *   provider: "Wave",
   *   phoneNumber: "+221771234567"
   * }
   */
  withdraw: publicProcedure
    .input(
      z.object({
        amount: z.number().min(0.01).max(10000),
        country: z.string().length(2), // Country code
        provider: z.string(),
        phoneNumber: z.string().min(10), // Phone number
      })
    )
    .mutation(async ({ input, ctx }) => {
      // Get user ID from context (if authenticated)
      const userId = ctx.user?.id || 0;

      // Create withdrawal
      const withdrawal = await createInstantWithdrawal(
        userId,
        input.amount,
        input.country,
        input.provider,
        input.phoneNumber
      );

      if (!withdrawal) {
        return {
          success: false,
          error: 'Failed to process withdrawal. Please try again.',
        };
      }

      return {
        success: withdrawal.status === 'completed',
        withdrawal: {
          id: withdrawal.id,
          amount: withdrawal.amount,
          status: withdrawal.status,
          transactionId: withdrawal.transactionId,
          completedAt: withdrawal.completedAt,
          message: withdrawal.status === 'completed'
            ? `✅ Money sent to ${input.phoneNumber}! Check your ${input.provider} account.`
            : `⚠️ Withdrawal pending. Will retry automatically.`,
        },
        error: withdrawal.failureReason,
      };
    }),

  /**
   * Get withdrawal history
   * GET /api/trpc/instantWithdrawal.getHistory
   */
  getHistory: publicProcedure.query(({ ctx }) => {
    const userId = ctx.user?.id || 0;
    const history = getWithdrawalHistory(userId);
    return {
      withdrawals: history.map((w) => ({
        id: w.id,
        amount: w.amount,
        country: w.country,
        provider: w.provider,
        status: w.status,
        createdAt: w.createdAt,
        completedAt: w.completedAt,
      })),
      total: history.length,
    };
  }),

  /**
   * Get withdrawal statistics
   * GET /api/trpc/instantWithdrawal.getStats
   */
  getStats: publicProcedure.query(({ ctx }) => {
    const userId = ctx.user?.id || 0;
    const stats = getWithdrawalStats(userId);
    return {
      totalWithdrawn: stats.totalWithdrawn,
      totalFees: stats.totalFees,
      successfulWithdrawals: stats.successfulWithdrawals,
      failedWithdrawals: stats.failedWithdrawals,
      lastWithdrawal: stats.lastWithdrawal,
    };
  }),

  /**
   * Get all supported countries
   * GET /api/trpc/instantWithdrawal.getSupportedCountries
   */
  getSupportedCountries: publicProcedure.query(() => {
    const countries = Object.keys(INSTANT_PROVIDERS_BY_COUNTRY).map((code) => ({
      code,
      providers: INSTANT_PROVIDERS_BY_COUNTRY[code],
      count: INSTANT_PROVIDERS_BY_COUNTRY[code].length,
    }));

    return {
      countries,
      total: countries.length,
      coverage: 'All major African countries',
    };
  }),
});
