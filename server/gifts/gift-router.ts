import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";

import {
  getAvailableGifts,
  getGiftTransactions,
  prepareGift,
} from "./gift-service";

/**
 * =========================================================
 * 🎁 AFRITOK — GIFT ROUTER
 * =========================================================
 *
 * Routes API des cadeaux virtuels.
 *
 * IMPORTANT :
 * Pour cette étape, aucun débit réel de Coins
 * ne doit être effectué.
 */

export const giftRouter = router({
  /**
   * ========================================================
   * 🎁 CADEAUX DISPONIBLES
   * ========================================================
   */

  getGifts: protectedProcedure.query(async () => {
    return await getAvailableGifts();
  }),

  /**
   * ========================================================
   * 🎁 PRÉPARER L'ENVOI D'UN CADEAU
   * ========================================================
   *
   * Cette procédure prépare l'envoi.
   * Le débit réel des Coins reste désactivé.
   */

  prepareGift: protectedProcedure
    .input(
      z.object({
        receiverId: z.number().int().positive(),

        giftId: z.number().int().positive(),

        quantity: z.number().int().min(1).max(100).default(1),

        videoId: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional(),

        liveId: z
          .number()
          .int()
          .positive()
          .nullable()
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return await prepareGift(
        ctx.user.id,
        input.receiverId,
        input.giftId,
        input.quantity,
        input.videoId ?? null,
        input.liveId ?? null
      );
    }),

  /**
   * ========================================================
   * 📋 HISTORIQUE DE MES CADEAUX
   * ========================================================
   */

  getMyTransactions: protectedProcedure.query(async ({ ctx }) => {
    return await getGiftTransactions(ctx.user.id);
  }),
});
