import { router, protectedProcedure } from "../_core/trpc";
import {
  getUserCoins,
  getCoinBalance,
  getCoinTransactions,
} from "./coin-service";

/**
 * ============================================
 * 🪙 AFRITOK COINS ROUTER
 * ============================================
 *
 * API sécurisée du portefeuille de coins.
 *
 * Pour le moment :
 * - consultation du solde ✅
 * - historique ✅
 * - achat réel ❌ pas encore branché
 * - paiement réel ❌ pas encore branché
 */

/**
 * ============================================
 * 🪙 COINS ROUTER
 * ============================================
 */

export const coinsRouter = router({

  /**
   * ==========================================
   * 💰 MON PORTEFEUILLE
   * ==========================================
   */

  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const wallet = await getUserCoins(userId);

    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      totalPurchased: Number(wallet.totalPurchased),
      totalSpent: Number(wallet.totalSpent),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }),

  /**
   * ==========================================
   * 🪙 MON SOLDE
   * ==========================================
   */

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;

    const balance = await getCoinBalance(userId);

    return {
      balance,
    };
  }),

  /**
   * ==========================================
   * 📋 HISTORIQUE DE MES COINS
   * ==========================================
   */

  getTransactions: protectedProcedure.query(
    async ({ ctx }) => {
      const userId = ctx.user.id;

      const transactions =
        await getCoinTransactions(userId);

      return transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(
          transaction.balanceBefore
        ),
        balanceAfter: Number(
          transaction.balanceAfter
        ),
        referenceId: transaction.referenceId,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }));
    }
  ),
});
