import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  getUserById,
  getUserVideos,
  getUserEarnings,
  createWithdrawalRecord,
} from "./db";

/**
 * ============================================
 * MONETIZATION ROUTER (FINAL CLEAN)
 * ============================================
 */

export const monetizationRouter = router({
  /**
   * 📊 Dashboard utilisateur
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const user = await getUserById(ctx.user.id);
    const videos = await getUserVideos(ctx.user.id);

    return {
      balance: user?.totalEarnings || "0",
      totalWithdrawals: user?.totalWithdrawals || "0",
      totalVideos: videos.length,
    };
  }),

  /**
   * 📈 Earnings list
   */
  myEarnings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    return getUserEarnings(ctx.user.id);
  }),

  /**
   * 💸 Withdraw money
   */
  withdraw: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(0.1),
        paymentMethod: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await createWithdrawalRecord(
        ctx.user.id,
        input.amount,
        input.paymentMethod
      );

      return { success: true };
    }),

  /**
   * ✅ Check if creator eligible
   */
  isCreatorEligible: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const videos = await getUserVideos(ctx.user.id);

    return {
      eligible: videos.length >= 1, // condition simple
    };
  }),
});
