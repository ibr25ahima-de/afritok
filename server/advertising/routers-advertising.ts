import {
  router,
  protectedProcedure,
} from "./_core/trpc";

import { z } from "zod";

import {
  createAdvertisingCampaign,
  attachAdvertisingPayment,
  pauseAdvertisingCampaign,
  resumeAdvertisingCampaign,
  cancelAdvertisingCampaign,
} from "./advertising/advertising-service";

import {
  getNextAdvertisement,
  getAdvertisingCampaign,
} from "./advertising/ad-delivery-service";

import {
  recordAdImpression,
  recordAdClick,
  getAdStatistics,
} from "./advertising/ad-events-service";

/**
 * =========================================================
 * 📢 AFRITOK — ADVERTISING ROUTER
 * =========================================================
 *
 * Communication entre le frontend et le système
 * publicitaire.
 *
 * Les entreprises pourront :
 *
 * - créer une campagne
 * - choisir texte / image / vidéo
 * - définir leur budget
 * - définir la période
 * - cibler leur audience
 * - suivre les impressions
 * - suivre les clics
 *
 * Les utilisateurs pourront :
 *
 * - recevoir une publicité adaptée
 * - voir la publicité séparément du feed normal
 * - cliquer dessus
 */

/**
 * =========================================================
 * 📢 ROUTER PUBLICITAIRE
 * =========================================================
 */

export const advertisingRouter = router({

  /**
   * -------------------------------------------------------
   * 📢 CRÉER UNE CAMPAGNE
   * -------------------------------------------------------
   */

  createCampaign: protectedProcedure
    .input(
      z.object({
        advertiserName: z.string().min(1).max(150),

        name: z.string().min(1).max(200),

        adType: z.enum([
          "text",
          "image",
          "video",
        ]),

        textContent: z
          .string()
          .max(5000)
          .optional(),

        imageUrl: z
          .string()
          .url()
          .optional(),

        videoUrl: z
          .string()
          .url()
          .optional(),

        destinationUrl: z
          .string()
          .url()
          .optional(),

        budget: z
          .number()
          .positive(),

        currency: z
          .string()
          .default("XOF"),

        startDate: z
          .string()
          .datetime(),

        endDate: z
          .string()
          .datetime(),

        targetCountry: z
          .string()
          .max(100)
          .optional(),

        targetGender: z
          .string()
          .max(30)
          .optional(),

        targetAgeMin: z
          .number()
          .int()
          .min(13)
          .max(100)
          .optional(),

        targetAgeMax: z
          .number()
          .int()
          .min(13)
          .max(100)
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      const campaign =
        await createAdvertisingCampaign({

          advertiserId:
            ctx.user.id,

          advertiserName:
            input.advertiserName,

          name:
            input.name,

          adType:
            input.adType,

          textContent:
            input.textContent,

          imageUrl:
            input.imageUrl,

          videoUrl:
            input.videoUrl,

          destinationUrl:
            input.destinationUrl,

          budget:
            input.budget,

          currency:
            input.currency,

          startDate:
            new Date(input.startDate),

          endDate:
            new Date(input.endDate),

          targetCountry:
            input.targetCountry,

          targetGender:
            input.targetGender,

          targetAgeMin:
            input.targetAgeMin,

          targetAgeMax:
            input.targetAgeMax,
        });

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * -------------------------------------------------------
   * 💳 ASSOCIER LE PAIEMENT
   * -------------------------------------------------------
   *
   * Cette étape ne confirme PAS le paiement.
   *
   * Elle associe simplement la référence du paiement
   * à la campagne.
   *
   * La confirmation réelle reste gérée par
   * le système de paiement.
   */

  attachPayment: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),

        paymentReference:
          z.string().min(1).max(150),
      })
    )
    .mutation(async ({ input }) => {

      const campaign =
        await attachAdvertisingPayment(
          input.campaignId,
          input.paymentReference
        );

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * -------------------------------------------------------
   * ⏸️ PAUSE
   * -------------------------------------------------------
   */

  pauseCampaign: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {

      const campaign =
        await pauseAdvertisingCampaign(
          input.campaignId
        );

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * -------------------------------------------------------
   * ▶️ REPRENDRE
   * -------------------------------------------------------
   */

  resumeCampaign: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {

      const campaign =
        await resumeAdvertisingCampaign(
          input.campaignId
        );

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * -------------------------------------------------------
   * ❌ ANNULER
   * -------------------------------------------------------
   */

  cancelCampaign: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {

      const campaign =
        await cancelAdvertisingCampaign(
          input.campaignId
        );

      return {
        success: true,
        campaign,
      };
    }),

  /**
   * -------------------------------------------------------
   * 📢 OBTENIR UNE PUBLICITÉ
   * -------------------------------------------------------
   */

  getNextAd: protectedProcedure
    .input(
      z.object({
        country:
          z.string().optional(),

        gender:
          z.string().optional(),

        age:
          z.number().int().optional(),
      })
    )
    .query(async ({ ctx, input }) => {

      return getNextAdvertisement({
        userId:
          ctx.user.id,

        country:
          input.country,

        gender:
          input.gender,

        age:
          input.age,
      });
    }),

  /**
   * -------------------------------------------------------
   * 👁️ IMPRESSION
   * -------------------------------------------------------
   */

  recordImpression: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      return recordAdImpression({
        campaignId:
          input.campaignId,

        userId:
          ctx.user.id,
      });
    }),

  /**
   * -------------------------------------------------------
   * 🖱️ CLIC
   * -------------------------------------------------------
   */

  recordClick: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {

      return recordAdClick({
        campaignId:
          input.campaignId,

        userId:
          ctx.user.id,
      });
    }),

  /**
   * -------------------------------------------------------
   * 📊 STATISTIQUES
   * -------------------------------------------------------
   */

  statistics: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {

      return getAdStatistics(
        input.campaignId
      );
    }),

  /**
   * -------------------------------------------------------
   * 🔎 CAMPAGNE
   * -------------------------------------------------------
   */

  getCampaign: protectedProcedure
    .input(
      z.object({
        campaignId:
          z.number().int().positive(),
      })
    )
    .query(async ({ input }) => {

      return getAdvertisingCampaign(
        input.campaignId
      );
    }),
});