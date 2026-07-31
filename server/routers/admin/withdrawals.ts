import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { withdrawals } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

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
    .input((val: { withdrawalId: number }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(withdrawals)
        .set({ status: "paid" })
        .where(eq(withdrawals.id, input.withdrawalId));

      return { success: true };
    }),
});
