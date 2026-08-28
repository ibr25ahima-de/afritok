import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import {
  createAdvertisingCampaign,
  attachAdvertisingPayment,
  activateAdvertisingCampaign,
  pauseAdvertisingCampaign,
  resumeAdvertisingCampaign,
  cancelAdvertisingCampaign,
} from "./advertising/advertising-service";
import {
  recordAdImpression,
  recordAdClick,
  getAdStatistics,
} from "./advertising/ad-events-service";
import { getOwnedAdvertisingCampaign } from "./advertising/ad-access-security-service";
import {
  getNextAdvertisement,
  getAdvertisingCampaign,
} from "./advertising/ad-delivery-service";

export const advertisingRouter = router({
  createCampaign: protectedProcedure
    .input(z.object({
      advertiserName: z.string().min(1),
      name: z.string().min(1),
      adType: z.enum(["text", "image", "video"]),
      textContent: z.string().optional(),
      imageUrl: z.string().optional(),
      videoUrl: z.string().optional(),
      destinationUrl: z.string().url().optional(),
      budget: z.number().positive(),
      currency: z.string().length(3).default("XOF"),
      startDate: z.coerce.date(),
      endDate: z.coerce.date(),
      targetCountry: z.string().optional(),
      targetGender: z.string().optional(),
      targetAgeMin: z.number().int().positive().optional(),
      targetAgeMax: z.number().int().positive().optional(),
    }))
    .mutation(async ({ ctx, input }) =>
      createAdvertisingCampaign({ advertiserId: ctx.user.id, ...input })
    ),

  attachPayment: protectedProcedure
    .input(z.object({
      campaignId: z.number().int().positive(),
      paymentReference: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) =>
      attachAdvertisingPayment(input.campaignId, input.paymentReference, ctx.user.id)
    }),

  activateCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      activateAdvertisingCampaign(input.campaignId, ctx.user.id)
    }),

  pauseCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      pauseAdvertisingCampaign(input.campaignId, ctx.user.id)
    }),

  resumeCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      resumeAdvertisingCampaign(input.campaignId, ctx.user.id)
    }),

  cancelCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      cancelAdvertisingCampaign(input.campaignId, ctx.user.id)
    }),

  getNextAdvertisement: protectedProcedure
    .input(z.object({
      country: z.string().optional(),
      gender: z.string().optional(),
      age: z.number().int().positive().optional(),
    }))
    .query(async ({ ctx, input }) =>
      getNextAdvertisement({
        userId: ctx.user.id,
        country: input.country,
        gender: input.gender,
        age: input.age,
      })
    ),

  getCampaign: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await getOwnedAdvertisingCampaign(input.campaignId, ctx.user.id);
      return getAdvertisingCampaign(input.campaignId);
    }),

  recordImpression: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      recordAdImpression({ campaignId: input.campaignId, userId: ctx.user.id })
    ),

  recordClick: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) =>
      recordAdClick({ campaignId: input.campaignId, userId: ctx.user.id })
    ),

  getStatistics: protectedProcedure
    .input(z.object({ campaignId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      await getOwnedAdvertisingCampaign(input.campaignId, ctx.user.id);
      return getAdStatistics(input.campaignId);
    }),
});
