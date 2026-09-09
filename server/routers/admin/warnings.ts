import { router, adminProcedure } from "../../_core/trpc";
import { db } from "../../db";
import { users, warnings } from "../../../drizzle/schema";
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
      const target = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
      if (target[0].role === "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas avertir un autre administrateur." });
      }
      await db.insert(warnings).values({ userId: input.userId, adminId: ctx.user.id, reason: input.reason, message: input.message });
      return { success: true };
    }),

  getWarnings: adminProcedure.query(async () => {
    return db.select().from(warnings).orderBy(desc(warnings.createdAt));
  }),
});
