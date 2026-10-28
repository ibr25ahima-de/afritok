import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { withdrawals } from "../../../drizzle/schema";
import { eq, desc, and } from "drizzle-orm";
import { z } from "zod";

export const withdrawalsRouter = router({
  /**
   * 📥 Voir tous les retraits
   */
  getAllWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db
      .select()
      .from(withdrawals)
      .orderBy(desc(withdrawals.createdAt));
  }),

  /**
   * 💰 Marquer un retrait comme payé
   */
  markWithdrawalPaid: protectedProcedure
    .input(z.object({ withdrawalId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const updated = await db
        .update(withdrawals)
        .set({ status: "paid" })
        .where(and(eq(withdrawals.id, input.withdrawalId), eq(withdrawals.status, "pending")))
        .returning({ id: withdrawals.id });

      if (updated.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Retrait introuvable ou déjà traité." });
      }

      return { success: true };
    }),
});
