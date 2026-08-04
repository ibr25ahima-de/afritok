import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { users } from "../../../drizzle/schema";
import { eq, desc } from "drizzle-orm";

export const usersRouter = router({
  /**
   * 👤 Voir tous les utilisateurs
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  /**
   * 🚫 Bannir un utilisateur
   */
  banUser: protectedProcedure
    .input((val: {
      userId: number;
      reason: string;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isBanned: true,
          banReason: input.reason,
          bannedAt: new Date().toISOString(),
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ✅ Débannir un utilisateur
   */
  unbanUser: protectedProcedure
    .input((val: {
      userId: number;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isBanned: false,
          banReason: null,
          bannedAt: null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ⏸️ Suspendre un utilisateur
   */
  suspendUser: protectedProcedure
    .input((val: {
      userId: number;
      days: number;
      reason: string;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + input.days);

      await db
        .update(users)
        .set({
          isSuspended: true,
          suspendedUntil: suspendedUntil.toISOString(),
          suspensionReason: input.reason,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ▶️ Lever une suspension
   */
  unsuspendUser: protectedProcedure
    .input((val: { userId: number }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isSuspended: false,
          suspendedUntil: null,
          suspensionReason: null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * 👤 Voir les détails d'un utilisateur
   */
  getUserDetails: protectedProcedure
    .input((val: { userId: number }) => val)
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId));

      if (user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur introuvable",
        });
      }

      return user[0];
    }),
});
