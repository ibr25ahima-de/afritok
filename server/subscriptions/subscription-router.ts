import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { PAYMENT_OPERATORS } from "../payments/payment-types";
import { initiateProviderPayment } from "../payments/payment-provider";
import { createPremiumSubscriptionPayment, getPremiumPaymentStatus, getActivePremiumSubscription } from "./subscription-service";
import { getPremiumAnalytics } from "./premium-analytics-service";
import { AFRITOK_PREMIUM_PLANS, getPremiumPlan } from "./subscription-plans";
import { applyPremiumVideoOptions } from "./premium-video-publishing";

const premiumVideoOptionsSchema = z.object({
  videoId: z.number().int().positive(),
  quality: z.enum(["standard", "hd"]).default("standard"),
  scheduledAt: z.string().datetime().nullable().optional(),
  commentsMode: z.enum(["all", "followers", "off"]).default("all"),
});

export const subscriptionRouter = router({
  plans: protectedProcedure.query(() => AFRITOK_PREMIUM_PLANS),
  status: protectedProcedure.query(async ({ ctx }) => { const subscription = await getActivePremiumSubscription(ctx.user.id); return { isPremium: Boolean(subscription), expiresAt: subscription?.expires_at ?? null }; }),
  analytics: protectedProcedure.input(z.object({ days: z.number().int().min(7).max(90).default(30) })).query(async ({ ctx, input }) => getPremiumAnalytics(ctx.user.id, input.days)),
  createPayment: protectedProcedure.input(z.object({ planId: z.string(), operator: z.enum(PAYMENT_OPERATORS), phone: z.string().min(8) })).mutation(async ({ ctx, input }) => {
    const plan = getPremiumPlan(input.planId); if (!plan) throw new Error("Formule Premium invalide.");
    const payment = await createPremiumSubscriptionPayment({ userId: ctx.user.id, planId: input.planId, operator: input.operator, phone: input.phone });
    const provider = await initiateProviderPayment({ referenceId: payment.referenceId, amount: payment.amount, currency: payment.currency, operator: input.operator, phone: input.phone });
    return { ...payment, providerStatus: provider.status, providerReference: provider.providerReference ?? null, providerMessage: provider.message };
  }),
  paymentStatus: protectedProcedure.input(z.object({ referenceId: z.string().min(1) })).query(async ({ ctx, input }) => getPremiumPaymentStatus(ctx.user.id, input.referenceId)),
  applyVideoOptions: protectedProcedure.input(premiumVideoOptionsSchema).mutation(async ({ ctx, input }) => applyPremiumVideoOptions(ctx.user.id, input.videoId, input)),
});
