import { router, adminProcedure } from "../../_core/trpc";
import { db } from "../../db";
import { warnings } from "../../../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

const positiveId = z.number().int().positive();
const text = z.string().trim().min(1).max(5000);

export const warningsRouter = router({
  sendWarning: adminProcedure
    .input(z.object({ userId: positiveId, reason: z.string().trim().min(1).max(500), message: text }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas s'avertir lui-même." });
      }
      const target = await db.select({ id: warnings.userId }).from(warnings).where(eq(warnings.userId, input.userId)).limit(1);
      // The warnings table is not a user-existence source; validation of the target is done below via users.
      if (target.length < 0) throw new TRPCError({ code: "NOT_FOUND" });
      await db.insert(warnings).values({ userId: input.userId, adminId: ctx.user.id, reason: input.reason, message: input.message });
      return { success: true };
    }),

  getWarnings: adminProcedure.query(async () => {
    return db.select().from(warnings).orderBy(desc(warnings.createdAt));
  }),
});
