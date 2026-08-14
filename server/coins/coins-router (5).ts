import {
  router,
  protectedProcedure,
  publicProcedure,
} from "../_core/trpc";

import { z } from "zod";

import {
  getUserCoins,
  getCoinBalance,
  getCoinTransactions,
} from "./coin-service";

import {
  getActiveGifts,
  sendGift,
} from "./gifts-service";

export const coinsRouter = router({

  /**
   * =========================================================
   * 🪙 PORTEFEUILLE
   * =========================================================
   */

  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getUserCoins(ctx.user.id);

    return {
      id: wallet.id,
      userId: wallet.userId,

      balance: Number(wallet.balance),

      totalPurchased:
        Number(wallet.totalPurchased),

      totalSpent:
        Number(wallet.totalSpent),

      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }),


  /**
   * =========================================================
   * 🪙 SOLDE
   * =========================================================
   */

  getBalance: protectedProcedure.query(async ({ ctx }) => {
    return {
      balance:
        await getCoinBalance(ctx.user.id),
    };
  }),


  /**
   * =========================================================
   * 🪙 PACKAGES
   * =========================================================
   */

  getPackages: publicProcedure.query(async () => {
    const { getCoinPackages } =
      await import("./purchase-service");

    return getCoinPackages();
  }),


  /**
   * =========================================================
   * 💳 ACHAT DE COINS
   * =========================================================
   */

  purchase: protectedProcedure
    .input(
      z.object({
        packageId:
          z.string().min(1),

        paymentReference:
          z.string().min(5),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const { purchaseCoins } =
        await import("./purchase-service");

      return purchaseCoins({
        userId: ctx.user.id,

        packageId:
          input.packageId,

        paymentReference:
          input.paymentReference,
      });
    }),


  /**
   * =========================================================
   * 📋 TRANSACTIONS COINS
   * =========================================================
   */

  getTransactions: protectedProcedure
    .input(
      z.object({
        limit:
          z.number()
            .int()
            .min(1)
            .max(100)
            .default(50),
      })
    )
    .query(async ({ ctx, input }) => {

      const transactions =
        await getCoinTransactions(
          ctx.user.id
        );

      return transactions
        .slice(0, input.limit)
        .map((transaction) => ({
          id: transaction.id,

          type:
            transaction.type,

          amount:
            Number(transaction.amount),

          balanceBefore:
            Number(
              transaction.balanceBefore
            ),

          balanceAfter:
            Number(
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
   * =========================================================
   * 🎁 CATALOGUE DES CADEAUX
   * =========================================================
   *
   * IMPORTANT :
   *
   * Le catalogue vient maintenant directement de :
   *
   * server/coins/gifts.ts
   *
   * Le client reçoit donc :
   *
   * id
   * name
   * icon
   * coinPrice
   *
   * pour pouvoir afficher correctement les cadeaux.
   */

  getActiveGifts:
    publicProcedure.query(async () => {

      const gifts =
        await getActiveGifts();

      return gifts.map((gift) => ({
        id: gift.id,

        name: gift.name,

        icon: gift.icon,

        coinPrice:
          gift.coins,

        isActive:
          gift.isActive,
      }));
    }),


  /**
   * =========================================================
   * 🎁 ENVOYER UN CADEAU
   * =========================================================
   */

  sendGift:
    protectedProcedure

      .input(
        z.object({

          /**
           * ID du destinataire
           */
          recipientId:
            z.number()
              .int()
              .positive(),

          /**
           * IMPORTANT :
           *
           * Le catalogue utilise maintenant
           * des IDs texte.
           *
           * Exemple :
           *
           * "rose"
           * "diamond"
           * "lion"
           * "afritok-legend"
           */
          giftId:
            z.string()
              .min(1)
              .max(100),

          /**
           * Quantité
           */
          quantity:
            z.number()
              .int()
              .min(1)
              .max(100),

          /**
           * Origine du cadeau
           */
          context:
            z.enum([
              "video",
              "live",
            ]),

          /**
           * ID de la vidéo ou du live
           */
          contextId:
            z.string()
              .max(100)
              .optional(),

          /**
           * Protection contre
           * les doubles envois
           */
          idempotencyKey:
            z.string()
              .min(10)
              .max(150),
        })
      )

      .mutation(async ({ ctx, input }) => {

        const result =
          await sendGift({

            senderId:
              ctx.user.id,

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


        /**
         * ===================================================
         * RÉPONSE AU CLIENT
         * ===================================================
         */

        return {

          success:
            result.success,

          duplicate:
            result.duplicate,

          transaction:
            result.transaction,

          balance:
            Number(
              result.balance
            ),

          recipientBalance:
            Number(
              result.recipientBalance
            ),

          gift: {

            id:
              result.gift.id,

            name:
              result.gift.name,

            icon:
              result.gift.icon,

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