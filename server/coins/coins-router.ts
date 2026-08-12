import { router, protectedProcedure, publicProcedure } from "../_core/trpc";
import { z } from "zod";

import {
  getUserCoins,
  getCoinBalance,
  getCoinTransactions,
} from "./coin-service";

import {
  getActiveGifts,
  sendGift,
} from "./gifts";

/**
 * ============================================
 * 🪙 AFRITOK — COINS ROUTER
 * ============================================
 *
 * Routes sécurisées du système Coins + Cadeaux.
 *
 * Pour cette étape :
 *
 * ✅ portefeuille
 * ✅ solde
 * ✅ historique Coins
 * ✅ catalogue cadeaux
 * ✅ envoi de cadeaux
 *
 * ❌ paiement réel
 * ❌ recharge réelle
 * ❌ retrait réel
 * ❌ conversion cadeau → argent réel
 *
 * Ces parties seront branchées plus tard.
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

      totalPurchased: Number(
        wallet.totalPurchased
      ),

      totalSpent: Number(
        wallet.totalSpent
      ),

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

  getTransactions: protectedProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(100).default(50),
      })
    )
    .query(async ({ ctx, input }) => {
      const userId = ctx.user.id;

      const transactions =
        await getCoinTransactions(
          userId
        );

      return transactions
        .slice(0, input.limit)
        .map((transaction) => ({
          id: transaction.id,

          type: transaction.type,

          amount: Number(
            transaction.amount
          ),

          balanceBefore: Number(
            transaction.balanceBefore
          ),

          balanceAfter: Number(
            transaction.balanceAfter
          ),

          referenceId:
            transaction.referenceId,

          description:
            transaction.description,

          createdAt:
            transaction.createdAt,
        }));
    }),


  /**
   * ==========================================
   * 🎁 CATALOGUE DES CADEAUX
   * ==========================================
   *
   * Cette route est publique.
   *
   * Elle permet à l'application d'afficher
   * les cadeaux actuellement disponibles.
   *
   * Le prix vient toujours du serveur.
   */

  getActiveGifts: publicProcedure
    .query(async () => {
      const gifts =
        await getActiveGifts();

      return gifts.map((gift) => ({
        id: gift.id,

        name: gift.name,

        description:
          gift.description,

        iconUrl:
          gift.iconUrl,

        animationUrl:
          gift.animationUrl,

        price: Number(
          gift.price
        ),

        isActive:
          gift.isActive,

        createdAt:
          gift.createdAt,

        updatedAt:
          gift.updatedAt,
      }));
    }),


  /**
   * ==========================================
   * 🎁 ENVOYER UN CADEAU
   * ==========================================
   *
   * L'utilisateur connecté est toujours
   * l'expéditeur.
   *
   * Le client fournit :
   *
   * - recipientId
   * - giftId
   * - quantity
   * - context
   * - contextId
   * - idempotencyKey
   *
   * Le client NE fournit PAS le prix.
   *
   * Le serveur récupère le prix depuis
   * la table gifts.
   */

  sendGift: protectedProcedure
    .input(
      z.object({
        recipientId:
          z.number().int().positive(),

        giftId:
          z.number().int().positive(),

        quantity:
          z.number().int().min(1).max(100),

        context:
          z.enum([
            "video",
            "live",
          ]),

        contextId:
          z.string().max(100).optional(),

        idempotencyKey:
          z.string().min(10).max(150),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const senderId =
        ctx.user.id;

      const result =
        await sendGift({
          senderId,

          recipientId:
            input.recipientId,

          giftId:
            input.giftId,

          quantity:
            input.quantity,

          context:
            input.context,

          contextId:
            input.contextId,

          idempotencyKey:
            input.idempotencyKey,
        });

      return {
        success:
          result.success,

        duplicate:
          result.duplicate,

        transaction:
          result.transaction,

        balance:
          Number(result.balance),

        recipientBalance:
          Number(
            result.recipientBalance
          ),

        gift: {
          id:
            result.gift.id,

          name:
            result.gift.name,

          price:
            Number(
              result.gift.price
            ),

          quantity:
            result.gift.quantity,

          totalAmount:
            Number(
              result.gift.totalAmount
            ),
        },
      };
    }),
});
