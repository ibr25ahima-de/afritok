import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { db } from "../db";
import { eq, desc } from "drizzle-orm";

import {
  walletTransactions,
} from "../../drizzle/schema-wallet";

import {
  getUserWallet,
  getWalletBalance,
  createPendingWalletDeposit,
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
   * 📋 HISTORIQUE DU PORTEFEUILLE
   * ========================================================
   */

  getTransactions: protectedProcedure.query(
    async ({ ctx }) => {
      const transactions = await db
        .select()
        .from(walletTransactions)
        .where(
          eq(
            walletTransactions.userId,
            ctx.user.id
          )
        )
        .orderBy(
          desc(walletTransactions.createdAt)
        );

      return transactions;
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
      const referenceId =
        `wallet_${ctx.user.id}_${Date.now()}_${Math.random()
          .toString(36)
          .slice(2, 10)}`;

      const result =
        await createPendingWalletDeposit({
          userId: ctx.user.id,
          amount: input.amount,
          paymentMethod: input.operator,
          phone: input.phone,
          referenceId,
        });

      return {
        success: true,
        userId: ctx.user.id,
        operator: input.operator,
        amount: input.amount,
        currency: "XOF",
        phone: input.phone,
        status: result.status,
        referenceId,
        message:
          "Recharge enregistrée. Paiement Mobile Money en attente.",
      };
    }),
});
