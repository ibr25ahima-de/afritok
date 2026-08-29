import {
  router,
  protectedProcedure,
  adminProcedure,
} from "./_core/trpc";

import { z } from "zod";

import {
  getPlatformWallet,
  recordPlatformRevenue,
} from "./platform-finance-service";

export const platformFinanceRouter = router({
  /**
   * =========================================================
   * 💰 SOLDE RÉEL AFRITOK
   * =========================================================
   */
  getWallet: protectedProcedure.query(async () => {
    const wallet = await getPlatformWallet();

    return {
      id: wallet.id,
      name: wallet.name,
      balance: Number(wallet.balance),
      totalRevenue: Number(wallet.totalRevenue),
      totalExpenses: Number(wallet.totalExpenses),
      currency: wallet.currency,
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }),

  /**
   * =========================================================
   * 💵 ENTRÉE D'ARGENT RÉEL — ADMIN UNIQUEMENT
   * =========================================================
   *
   * Les paiements utilisateurs ne doivent pas appeler cette
   * route directement. Ils passent par le settlement sécurisé
   * après confirmation réelle du prestataire.
   */
  recordRevenue: adminProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().length(3).default("XOF"),
        source: z.string().min(1).max(50),
        paymentProvider: z.string().max(30).optional(),
        paymentReference: z.string().max(255).optional(),
        externalId: z.string().max(255).optional(),
        description: z.string().max(500).optional(),
        userId: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const result = await recordPlatformRevenue(input);

      return {
        success: true,
        wallet: {
          balance: Number(result.wallet.balance),
          totalRevenue: Number(result.wallet.totalRevenue),
          totalExpenses: Number(result.wallet.totalExpenses),
          currency: result.wallet.currency,
        },
        transaction: result.transaction,
      };
    }),
});
