import { router, adminProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { reports } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";
import { z } from "zod";

const positiveId = z.number().int().positive();

export const reportsRouter = router({
  getReports: adminProcedure.query(async () => {
    return db.select().from(reports).orderBy(desc(reports.createdAt));
  }),

  resolveReport: adminProcedure
    .input(z.object({ reportId: positiveId }))
    .mutation(async ({ input }) => {
      const result = await db.update(reports).set({ status: "resolved" }).where(eq(reports.id, input.reportId));
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Signalement introuvable." });
      return { success: true };
    }),
});
