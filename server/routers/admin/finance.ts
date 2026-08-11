import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { db } from "../../db";
import {
  earnings,
  platformWithdrawals,
} from "../../../drizzle/schema";
import { eq, sql, desc } from "drizzle-orm";

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

    // ==========================================
    // 💰 PART AFritok
    // Même source que le Dashboard
    // ==========================================

    const earningsResult = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(
              CAST(${earnings.amount} AS double precision)
            ),
            0
          )
        `,
      })
      .from(earnings)
      .where(eq(earnings.userId, ADMIN_ID));

    // ==========================================
    // 💸 RETRAITS AFritok DÉJÀ PAYÉS
    // ==========================================

    const withdrawalsResult = await db
      .select({
        total: sql<string>`
          COALESCE(
            SUM(
              CAST(${platformWithdrawals.amount} AS double precision)
            ),
            0
          )
        `,
      })
      .from(platformWithdrawals)
      .where(eq(platformWithdrawals.status, "paid"));

    const totalEarned = safeParse(
      earningsResult[0]?.total
    );

    const totalWithdrawn = safeParse(
      withdrawalsResult[0]?.total
    );

    const available = Math.max(
      0,
      totalEarned - totalWithdrawn
    );

    console.log("========== PLATFORM FINANCE ==========");
    console.log("ADMIN ID =", ADMIN_ID);
    console.log("EARNINGS RESULT =", earningsResult);
    console.log("TOTAL EARNED =", totalEarned);
    console.log("TOTAL WITHDRAWN =", totalWithdrawn);
    console.log("AVAILABLE =", available);
    console.log("======================================");

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

      // ========================================
      // 💰 RÉCUPÉRER LE SOLDE AFritok
      // ========================================

      const earningsResult = await db
        .select({
          total: sql<string>`
            COALESCE(
              SUM(
                CAST(${earnings.amount} AS double precision)
              ),
              0
            )
          `,
        })
        .from(earnings)
        .where(eq(earnings.userId, ADMIN_ID));

      const withdrawalsResult = await db
        .select({
          total: sql<string>`
            COALESCE(
              SUM(
                CAST(${platformWithdrawals.amount} AS double precision)
              ),
              0
            )
          `,
        })
        .from(platformWithdrawals)
        .where(eq(platformWithdrawals.status, "paid"));

      const totalEarned = safeParse(
        earningsResult[0]?.total
      );

      const totalWithdrawn = safeParse(
        withdrawalsResult[0]?.total
      );

      const available = Math.max(
        0,
        totalEarned - totalWithdrawn
      );

      // ========================================
      // ❌ SOLDE INSUFFISANT
      // ========================================

      if (input.amount > available) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            `Solde insuffisant. Disponible : ${available.toFixed(2)} $`,
        });
      }

      // ========================================
      // 💸 CRÉER LA DEMANDE DE RETRAIT
      // ========================================

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

  getPlatformWithdrawals: protectedProcedure.query(
    async ({ ctx }) => {

      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Accès réservé aux administrateurs.",
        });
      }

      return await db
        .select()
        .from(platformWithdrawals)
        .orderBy(
          desc(platformWithdrawals.createdAt)
        );
    }
  ),
});
