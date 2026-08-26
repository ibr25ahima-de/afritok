import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createAdvertisingCampaign,
  attachAdvertisingPayment,
  activateAdvertisingCampaign,
  pauseAdvertisingCampaign,
  resumeAdvertisingCampaign,
  cancelAdvertisingCampaign,
  recordAdvertisingImpression,
  recordAdvertisingClick,
} from "./advertising/advertising-service";

export const advertisingRouter = router({
  createCampaign: protectedProcedure
    .input(
      z.object({
        advertiserName: z.string().min(1),
        name: z.string().min(1),
        adType: z.enum(["text", "image", "video"]),

        textContent: z.string().optional(),
        imageUrl: z.string().optional(),
        videoUrl: z.string().optional(),
        destinationUrl: z.string().url().optional(),

        budget: z.number().positive(),
        currency: z.string().default("XOF"),

        startDate: z.coerce.date(),
        endDate: z.coerce.date(),

        targetCountry: z.string().optional(),
        targetGender: z.string().optional(),
        targetAgeMin: z.number().int().positive().optional(),
        targetAgeMax: z.number().int().positive().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new Error("Utilisateur non authentifié.");
      }

      return createAdvertisingCampaign({
        advertiserId: ctx.user.id,
        ...input,
      });
    }),

  attachPayment: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
        paymentReference: z.string().min(1),
      })
    )
    .mutation(async ({ input }) => {
      return attachAdvertisingPayment(
        input.campaignId,
        input.paymentReference
      );
    }),

  activateCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return activateAdvertisingCampaign(input.campaignId);
    }),

  pauseCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return pauseAdvertisingCampaign(input.campaignId);
    }),

  resumeCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return resumeAdvertisingCampaign(input.campaignId);
    }),

  cancelCampaign: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ input }) => {
      return cancelAdvertisingCampaign(input.campaignId);
    }),

  recordImpression: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordAdvertisingImpression(
        input.campaignId,
        ctx.user?.id
      );
    }),

  recordClick: protectedProcedure
    .input(
      z.object({
        campaignId: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return recordAdvertisingClick(
        input.campaignId,
        ctx.user?.id
      );
    }),
});
