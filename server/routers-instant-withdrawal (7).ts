import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createWithdrawalRecord, getUserById, getUserWithdrawals } from "./db";

/**
 * ============================================
 * WITHDRAWAL UX - FINAL CLEAN
 * ============================================
 */

export const instantWithdrawalRouter = router({
  // ✅ Correction 1: Renommer request -> withdraw
  withdraw: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        country: z.string(),
        provider: z.string(),
        phoneNumber: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      console.log("WITHDRAW INPUT:", input);
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const balance = Number(user.totalEarnings || 0);

      // 🚨 1. Minimum retrait
      const MIN_WITHDRAW = 1; // 1$
      if (input.amount < MIN_WITHDRAW) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Minimum retrait = ${MIN_WITHDRAW}$`,
        });
      }

      // 🚨 2. Vérifier solde
      if (input.amount > balance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solde insuffisant",
        });
      }

      // 🚨 3. Méthode autorisée
      const allowedMethods = ["MTN", "ORANGE", "WAVE"];
      if (!allowedMethods.includes(input.provider.toUpperCase())) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Méthode non supportée",
        });
      }

      // 🚨 4. Montant suspect (Anti-Fraude)
      if (input.amount > 1000) {
        console.warn("🚨 FRAUD ATTEMPT", {
          userId: ctx.user.id,
          reason: "amount_too_high",
          amount: input.amount,
        });
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Amount too high",
        });
      }

      // 💾 5. Créer retrait (status = pending)
      await createWithdrawalRecord(
        ctx.user.id,
        input.amount,
        input.provider.toUpperCase(), // ✅ provider au lieu de method
        input.phoneNumber // ✅ phoneNumber au lieu de phone
      );


      return {
        success: true,
        message:
          "✅ Demande envoyée.\n💰 Paiement sous 24h.\n📱 Assure-toi que ton numéro est correct.",
      };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const withdrawals = await getUserWithdrawals(ctx.user.id);
    return withdrawals;
  }),
});
