import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  getUserById,
  createWithdrawalRecord,
  getUserWithdrawals,
} from "./db";

/**
 * ============================================
 * INSTANT WITHDRAWAL (SEMI-AUTO SYSTEM)
 * ============================================
 */

export const instantWithdrawalRouter = router({
  /**
   * 💸 Request withdrawal
   */
  request: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(0.1),
        method: z.enum(["mtn", "orange", "wave"]),
        phone: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      const balance = parseFloat(user.totalEarnings?.toString() || "0");

      if (input.amount > balance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solde insuffisant" });
      }

      // 💾 Save withdrawal
      await createWithdrawalRecord(
        ctx.user.id,
        input.amount,
        `${input.method}:${input.phone}`
      );

      console.log(
        `[WITHDRAW REQUEST] User ${ctx.user.id} -> ${input.amount} via ${input.method} (${input.phone})`
      );

      return { success: true };
    }),

  /**
   * 📜 User withdrawal history
   */
  history: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    return getUserWithdrawals(ctx.user.id);
  }),
});
