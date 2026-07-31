import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { reports } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const reportsRouter = router({
  /**
   * 🚨 Voir tous les signalements
   */
  getReports: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db
      .select()
      .from(reports)
      .orderBy(desc(reports.createdAt));
  }),

  /**
   * ✅ Traiter un signalement
   */
  resolveReport: protectedProcedure
    .input((val: { reportId: number }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(reports)
        .set({
          status: "resolved",
        })
        .where(eq(reports.id, input.reportId));

      return {
        success: true,
      };
    }),
});
