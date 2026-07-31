import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { users, videos, earnings, withdrawals } from "../../../drizzle/schema";
import { eq, sql, gt } from "drizzle-orm";

export const dashboardRouter = router({
  /**
   * 📊 STATISTIQUES PLATEFORME
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

    // 💰 Argent distribué
    const earningsTotal = await db
      .select({
        total: sql<number>`COALESCE(SUM(${earnings.amount}),0)`,
      })
      .from(earnings)
      .where(sql`${earnings.userId} != 1`);

    // 🏦 Argent Afritok
    const appProfit = await db
      .select({
        total: sql<number>`COALESCE(SUM(${earnings.amount}),0)`,
      })
      .from(earnings)
      .where(eq(earnings.userId, 1));

    // 📅 Gains aujourd'hui
    const todayMoney = await db
      .select({
        total: sql<number>`COALESCE(SUM(${earnings.amount}),0)`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, today));

    return {
      // Utilisateurs
      users: Number(usersCount[0]?.count || 0),

      // Vidéos
      videos: Number(videosCount[0]?.count || 0),

      // Vues
      views: Number(viewsCount[0]?.total || 0),

      // Argent versé aux créateurs
      usersEarnings: Number(earningsTotal[0]?.total || 0),

      // Part AfriTok
      afritokProfit: Number(appProfit[0]?.total || 0),

      // Revenus aujourd'hui
      today: Number(todayMoney[0]?.total || 0),

      // Revenu total de la plateforme
      totalRevenue:
        Number(earningsTotal[0]?.total || 0) +
        Number(appProfit[0]?.total || 0),

      // Argent retiré
      totalWithdrawals: (
        await db
          .select({
            total: sql<number>`COALESCE(SUM(${withdrawals.amount}),0)`,
          })
          .from(withdrawals)
          .where(eq(withdrawals.status, "paid"))
      )[0]?.total || 0,

      // En attente de retrait
      pendingWithdrawals: (
        await db
          .select({
            total: sql<number>`COALESCE(SUM(${withdrawals.amount}),0)`,
          })
          .from(withdrawals)
          .where(eq(withdrawals.status, "pending"))
      )[0]?.total || 0,
    };
  }),
});
