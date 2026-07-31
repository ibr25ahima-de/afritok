import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { warnings } from "../../../drizzle/schema";
import { desc } from "drizzle-orm";

export const warningsRouter = router({
  /**
   * ⚠️ Envoyer un avertissement à un utilisateur
   */
  sendWarning: protectedProcedure
    .input((val: {
      userId: number;
      reason: string;
      message: string;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db.insert(warnings).values({
        userId: input.userId,
        adminId: ctx.user.id,
        reason: input.reason,
        message: input.message,
      });

      return {
        success: true,
      };
    }),

  /**
   * 📜 Voir tous les avertissements
   */
  getWarnings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db
      .select()
      .from(warnings)
      .orderBy(desc(warnings.createdAt));
  }),
});
