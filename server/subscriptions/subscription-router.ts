import { router, protectedProcedure } from "../_core/trpc";
import { z } from "zod";
import { PAYMENT_OPERATORS } from "../payments/payment-types";
import { initiateProviderPayment } from "../payments/payment-provider";
import { createPremiumSubscriptionPayment, getPremiumPaymentStatus } from "./subscription-service";
import { AFRITOK_PREMIUM_PLANS, getPremiumPlan } from "./subscription-plans";

export const subscriptionRouter = router({
  plans: protectedProcedure.query(() => AFRITOK_PREMIUM_PLANS),

  createPayment: protectedProcedure.input(z.object({
    planId: z.string(),
    operator: z.enum(PAYMENT_OPERATORS),
    phone: z.string().min(8),
  })).mutation(async ({ ctx, input }) => {
    const plan = getPremiumPlan(input.planId);
    if (!plan) throw new Error("Formule Premium invalide.");

    const payment = await createPremiumSubscriptionPayment({
      userId: ctx.user.id,
      planId: input.planId,
      operator: input.operator,
      phone: input.phone,
    });

    const provider = await initiateProviderPayment({
      referenceId: payment.referenceId,
      amount: payment.amount,
      currency: payment.currency,
      operator: input.operator,
      phone: input.phone,
    });

    return { ...payment, providerStatus: provider.status, providerReference: provider.providerReference ?? null, providerMessage: provider.message };
  }),

  paymentStatus: protectedProcedure.input(z.object({ referenceId: z.string().min(1) })).query(async ({ ctx, input }) => {
    return getPremiumPaymentStatus(ctx.user.id, input.referenceId);
  }),
});
