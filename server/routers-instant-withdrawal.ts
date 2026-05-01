import { router, protectedProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { db, createWithdrawalRecord, getUserById, getUserWithdrawals } from "./db";

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

      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND" });

      // 1. Vérifier solde
      if (user.balance < input.amount) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solde insuffisant" });
      }

      // 2. Déduire
      await db.user.update({
        where: { id: user.id },
        data: {
          balance: { decrement: input.amount },
          totalWithdrawals: { increment: input.amount }
        }
      });

      // 3. Enregistrer transaction
      await db.transaction.create({
        data: {
          userId: user.id,
          type: "withdrawal",
          amount: input.amount,
          status: "completed",
          method: "mobile_money",
          phoneNumber: input.phoneNumber
        }
      });

      // 4. Retour succès
      return {
        success: true,
        message: "Retrait simulé réussi"
      };
    }),

  getHistory: protectedProcedure.query(async ({ ctx }) => {
    const withdrawals = await getUserWithdrawals(ctx.user.id);
    return withdrawals;
  }),
}); 
