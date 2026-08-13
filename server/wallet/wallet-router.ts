import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";

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
 * ✅ récupérer le portefeuille
 * ✅ récupérer le solde
 * ✅ préparer une recharge
 *
 * ❌ paiement Mobile Money réel
 *
 * Le paiement réel sera connecté ensuite.
 */

const MOBILE_MONEY_OPERATORS = [
  "orange",
  "mtn",
  "moov",
  "wave",
] as const;

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

  /**
   * ========================================================
   * 📱 PRÉPARER UNE RECHARGE
   * ========================================================
   *
   * Cette route ne fait PAS encore de paiement réel.
   *
   * Elle vérifie simplement les informations envoyées
   * par l'utilisateur avant la connexion Mobile Money.
   */

  prepareRecharge: protectedProcedure
    .input(
      z.object({
        operator: z.enum(
          MOBILE_MONEY_OPERATORS
        ),

        amount: z
          .number()
          .int()
          .min(
            1000,
            "Le montant minimum est de 1 000 XOF."
          ),

        phone: z
          .string()
          .min(
            8,
            "Numéro de téléphone invalide."
          ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return {
        success: true,

        userId: ctx.user.id,

        operator: input.operator,

        amount: input.amount,

        currency: "XOF",

        phone: input.phone,

        status: "pending",

        message:
          "Recharge prête pour le paiement Mobile Money.",
      };
    }),
});
