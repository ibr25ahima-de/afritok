import { publicProcedure, router } from "../_core/trpc";
import { z } from "zod";

import {
  getNextAdvertisement,
} from "./ad-delivery-service";
import {
  recordAdImpression,
  recordAdClick,
} from "./ad-events-service";

/**
 * =========================================================
 * 📢 AFRITOK — PUBLIC ADVERTISING ROUTER
 * =========================================================
 *
 * Routes nécessaires à l'affichage des publicités aux
 * visiteurs connectés ou non.
 *
 * La création, le paiement, l'activation et les statistiques
 * privées restent dans advertisingRouter.
 */

export const publicAdvertisingRouter = router({
  getNextAdvertisement: publicProcedure
    .input(
      z.object({
        country: z.string().optional(),
        gender: z.string().optional(),
        age: z.number().int().positive().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return getNextAdvertisement({
        userId: ctx.user?.id,
        country: input.country,
        gender: input.gender,
        age: input.age,
      });
    }),

  recordImpression: publicProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordAdImpression({
        campaignId: input.campaignId,
        userId: ctx.user?.id,
      });
    }),

  recordClick: publicProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordAdClick({
        campaignId: input.campaignId,
        userId: ctx.user?.id,
      });
    }),
});
