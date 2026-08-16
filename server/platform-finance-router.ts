import {
  router,
  protectedProcedure,
} from "./_core/trpc";

import {
  getPlatformWallet,
} from "./platform-finance-service";


export const platformFinanceRouter = router({

  /**
   * =========================================================
   * 💰 SOLDE RÉEL AFRITOK
   * =========================================================
   */

  getWallet: protectedProcedure.query(async () => {

    const wallet =
      await getPlatformWallet();

    return {
      id: wallet.id,

      name: wallet.name,

      balance:
        Number(wallet.balance),

      totalRevenue:
        Number(wallet.totalRevenue),

      totalExpenses:
        Number(wallet.totalExpenses),

      currency:
        wallet.currency,

      createdAt:
        wallet.createdAt,

      updatedAt:
        wallet.updatedAt,
    };
  }),

});
