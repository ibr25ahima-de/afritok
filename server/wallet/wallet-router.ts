import { router, protectedProcedure } from "../_core/trpc";

import {
  getUserWallet,
  getWalletBalance,
} from "./wallet-service";

/**
 * =========================================================
 * 💰 AFRITOK — WALLET ROUTER
 * =========================================================
 *
 * Routes du portefeuille XOF.
 *
 * Pour cette première étape :
 *
 * ✅ récupérer le portefeuille
 * ✅ récupérer le solde
 *
 * ❌ recharge Mobile Money
 * ❌ achat de Coins
 *
 * Ces parties viendront après.
 */

export const walletRouter = router({

  /**
   * ========================================================
   * 💰 MON PORTEFEUILLE
   * ========================================================
   */

  getWallet: protectedProcedure.query(
    async ({ ctx }) => {
      const userId = ctx.user.id;

      const wallet =
        await getUserWallet(userId);

      return {
        id: wallet.id,

        userId: wallet.userId,

        balance:
          Number(wallet.balance),

        totalDeposited:
          Number(wallet.totalDeposited),

        totalUsedForCoins:
          Number(wallet.totalUsedForCoins),

        createdAt:
          wallet.createdAt,

        updatedAt:
          wallet.updatedAt,
      };
    }
  ),

  /**
   * ========================================================
   * 💰 MON SOLDE XOF
   * ========================================================
   */

  getBalance: protectedProcedure.query(
    async ({ ctx }) => {
      const userId = ctx.user.id;

      const balance =
        await getWalletBalance(userId);

      return {
        balance,
        currency: "XOF",
      };
    }
  ),
});
