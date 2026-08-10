import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db";
import {
  microEarnings,
  platformWithdrawals,
} from "../../../drizzle/schema";
import { eq, and, sql, desc } from "drizzle-orm";

const ADMIN_ID = 1;

function safeParse(value: unknown): number {
  if (value === null || value === undefined) return 0;

  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

export const financeRouter = router({
  // ============================================
  // 💰 SOLDE AFritok
  // ============================================

  getPlatformBalance: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès réservé aux administrateurs.",
      });
    }

    // 💰 Total gagné par AfriTok
    const earningsResult = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(CAST(${microEarnings.amount} AS double precision)),
            0
          )
        `,
      })
      .from(microEarnings)
      .where(
        and(
          eq(microEarnings.userId, ADMIN_ID),
          eq(microEarnings.type, "platform_fee")
        )
      );

    // 💸 Total déjà retiré par le propriétaire
    const withdrawalsResult = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(CAST(${platformWithdrawals.amount} AS double precision)),
            0
          )
        `,
      })
      .from(platformWithdrawals)
      .where(eq(platformWithdrawals.status, "paid"));

    const totalEarned = safeParse(earningsResult[0]?.total);
    const totalWithdrawn = safeParse(withdrawalsResult[0]?.total);

    const available = Math.max(0, totalEarned - totalWithdrawn);

    return {
      totalEarned,
      totalWithdrawn,
      available,
    };
  }),

  // ============================================
  // 💸 DEMANDER UN RETRAIT AFritok
  // ============================================

  requestPlatformWithdrawal: protectedProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        paymentMethod: z.string().min(2),
        phone: z.string().min(8),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs.",
        });
      }

      // Récupérer le solde actuel
      const earningsResult = await db
        .select({
          total: sql<string>`
            COALESCE(
              SUM(CAST(${microEarnings.amount} AS double precision)),
              0
            )
          `,
        })
        .from(microEarnings)
        .where(
          and(
            eq(microEarnings.userId, ADMIN_ID),
            eq(microEarnings.type, "platform_fee")
          )
        );

      const withdrawalsResult = await db
        .select({
          total: sql<string>`
            COALESCE(
              SUM(CAST(${platformWithdrawals.amount} AS double precision)),
              0
            )
          `,
        })
        .from(platformWithdrawals)
        .where(eq(platformWithdrawals.status, "paid"));

      const totalEarned = safeParse(earningsResult[0]?.total);
      const totalWithdrawn = safeParse(withdrawalsResult[0]?.total);

      const available = Math.max(0, totalEarned - totalWithdrawn);

      if (input.amount > available) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Solde insuffisant. Disponible : ${available.toFixed(2)} $`,
        });
      }

      const withdrawal = await db
        .insert(platformWithdrawals)
        .values({
          amount: input.amount.toFixed(4),
          paymentMethod: input.paymentMethod,
          phone: input.phone,
          status: "pending",
        })
        .returning();

      return {
        success: true,
        withdrawal: withdrawal[0],
      };
    }),

  // ============================================
  // 📋 HISTORIQUE DES RETRAITS AFritok
  // ============================================

  getPlatformWithdrawals: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: "Accès réservé aux administrateurs.",
      });
    }

    return await db
      .select()
      .from(platformWithdrawals)
      .orderBy(desc(platformWithdrawals.createdAt));
  }),
});
