import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { createWithdrawalRecord, getUserById, getUserWithdrawals } from "./db";

const ALLOWED_METHODS = ["MTN", "ORANGE", "WAVE"] as const;

const withdrawalInput = z.object({
  amount: z.number().finite().positive().max(1000),
  country: z.string().trim().min(2).max(64),
  provider: z.enum(ALLOWED_METHODS),
  phoneNumber: z.string().trim().min(8).max(20),
});

export const instantWithdrawalRouter = router({
  withdraw: protectedProcedure
    .input(withdrawalInput)
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const balance =
        Number(user.totalEarnings || 0) - Number(user.totalWithdrawals || 0);

      if (!Number.isFinite(balance) || input.amount > balance) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Solde insuffisant",
        });
      }

      try {
        const result = await createWithdrawalRecord(
          ctx.user.id,
          input.amount,
          input.provider,
          input.phoneNumber,
        );

        if (!result?.success) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Withdrawal failed",
          });
        }

        return {
          success: true,
          message: "Demande de retrait enregistrée et en attente de confirmation.",
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;

        const message = error instanceof Error ? error.message : "Withdrawal failed";
        if (message === "Insufficient balance") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Solde insuffisant" });
        }
        if (message === "Withdrawal destination does not match account") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Numéro de retrait invalide" });
        }

        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Impossible d'enregistrer le retrait",
        });
      }
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    return getUserWithdrawals(ctx.user.id);
  }),
});
