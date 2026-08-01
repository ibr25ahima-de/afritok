import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { users, videos, earnings, withdrawals } from "../../../drizzle/schema";
import { eq, sql, gt } from "drizzle-orm";

export const dashboardRouter = router({
  /**
   * 📊 STATISTIQUES PLATEFORME
   *
   * ⚠️ IMPORTANT : amount est numeric(12,4) → PostgreSQL retourne les
   * résultats de SUM/COALESCE sous forme de STRING.
   * On force le cast en double precision côté SQL pour avoir un nombre,
   * puis on parse en JavaScript pour être sûr.
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // 👥 Total utilisateurs
    const usersCount = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(users);

    // 🎬 Total vidéos
    const videosCount = await db
      .select({
        count: sql<number>`COUNT(*)`,
      })
      .from(videos);

    // 👁️ Vues totales
    const viewsCount = await db
      .select({
        total: sql<number>`COALESCE(SUM(${videos.views}),0)`,
      })
      .from(videos);

    // 💰 Argent distribué aux créateurs (userId != 1)
    // CAST AS double precision car amount est numeric → SUM retourne string
    const earningsTotal = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)),0)`,
      })
      .from(earnings)
      .where(sql`${earnings.userId} != 1`);

    // 🏦 Argent Afritok (userId = 1 = platform_fee)
    const appProfit = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)),0)`,
      })
      .from(earnings)
      .where(eq(earnings.userId, 1));

    // 📅 Gains aujourd'hui
    const todayMoney = await db
      .select({
        total: sql<number>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)),0)`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, today));

    // 💸 Retraits payés
    const paidWithdrawals = await db
      .select({
        total: sql<number>`COALESCE(SUM(${withdrawals.amount}),0)`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.status, "paid"));

    // ⏳ Retraits en attente
    const pendingWithdrawalsResult = await db
      .select({
        total: sql<number>`COALESCE(SUM(${withdrawals.amount}),0)`,
      })
      .from(withdrawals)
      .where(eq(withdrawals.status, "pending"));

    // Helper : parse un résultat SQL (peut être number ou string)
    const safeNum = (val: any): number => {
      if (val === null || val === undefined) return 0;
      if (typeof val === "number") return val;
      return parseFloat(String(val)) || 0;
    };

    const usersEarningsVal = safeNum(earningsTotal[0]?.total);
    const appProfitVal = safeNum(appProfit[0]?.total);

    return {
      // Utilisateurs
      users: Number(usersCount[0]?.count || 0),

      // Vidéos
      videos: Number(videosCount[0]?.count || 0),

      // Vues
      views: Number(viewsCount[0]?.total || 0),

      // Argent versé aux créateurs
      usersEarnings: usersEarningsVal,

      // Part AfriTok
      afritokProfit: appProfitVal,

      // Revenus aujourd'hui
      today: safeNum(todayMoney[0]?.total),

      // Revenu total de la plateforme
      totalRevenue: usersEarningsVal + appProfitVal,

      // Argent retiré
      totalWithdrawals: safeNum(paidWithdrawals[0]?.total),

      // En attente de retrait
      pendingWithdrawals: safeNum(pendingWithdrawalsResult[0]?.total),
    };
  }),
});
