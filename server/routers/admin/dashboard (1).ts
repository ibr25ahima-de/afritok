import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import { users, videos, earnings, withdrawals } from "../../../drizzle/schema";
import { eq, sql, gt } from "drizzle-orm";

/**
 * Helper : parser un résultat SQL qui peut être number OU string
 * (PostgreSQL retourne les numeric sous forme de string)
 */
function safeParse(val: any): number {
  if (val === null || val === undefined) return 0;
  if (typeof val === "number") return val;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
}

export const dashboardRouter = router({
  /**
   * 📊 STATISTIQUES PLATEFORME
   */
  getDashboardStats: protectedProcedure.query(async ({ ctx }) => {
    try {
      console.log("===== DASHBOARD =====");
      console.log("Utilisateur :", ctx.user);
      console.log("ROLE =", ctx.user?.role);
      console.log("ID =", ctx.user?.id);
      console.log("PHONE =", ctx.user?.phone);
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 👥 Total utilisateurs
      const usersCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(users);
      console.log("✅ users OK");

      // 🎬 Total vidéos
      const videosCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(videos);
      console.log("✅ videos OK");

      // 👁️ Vues totales
      const viewsCount = await db
        .select({ total: sql<number>`COALESCE(SUM(${videos.views}),0)` })
        .from(videos);
      console.log("✅ views OK");

      // 💰 Argent distribué aux créateurs (userId != 1)
      // CAST AS double precision car amount est numeric(12,4) → SUM retourne string
      const earningsTotal = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
        })
        .from(earnings)
        .where(sql`${earnings.userId} != 1`);
      console.log("✅ earnings OK");

      // 🏦 Part AfriTok (userId = 1 = platform_fee)
      const appProfit = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
        })
        .from(earnings)
        .where(eq(earnings.userId, 1));
      console.log("✅ appProfit OK");

      // 📅 Gains aujourd'hui
      const todayMoney = await db
        .select({
          total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
        })
        .from(earnings)
        .where(gt(earnings.createdAt, today));
      console.log("✅ todayMoney OK");

      // 💸 Retraits payés
      const paidWithdrawals = await db
        .select({
          total: sql<string>`
      COALESCE(SUM(CAST(${withdrawals.amount} AS double precision)), 0)
    `,
        })
        .from(withdrawals)
        .where(eq(withdrawals.status, "paid"));
      console.log("✅ paidWithdrawals OK");

      // ⏳ Retraits en attente
      const pendingWithdrawalsResult = await db
        .select({
          total: sql<string>`
      COALESCE(SUM(CAST(${withdrawals.amount} AS double precision)), 0)
    `,
        })
        .from(withdrawals)
        .where(eq(withdrawals.status, "pending"));
      console.log("✅ pendingWithdrawals OK");

      // Parse toutes les valeurs
      const usersEarningsVal = safeParse(earningsTotal[0]?.total);
      const appProfitVal = safeParse(appProfit[0]?.total);

      console.log({
        users: usersCount[0],
        videos: videosCount[0],
        views: viewsCount[0],
        earnings: earningsTotal[0],
      });

      console.log({
        users: Number(usersCount[0]?.count || 0),
        videos: Number(videosCount[0]?.count || 0),
        views: Number(viewsCount[0]?.total || 0),
        usersEarnings: Number(earningsTotal[0]?.total || 0),
        afritokProfit: Number(appProfit[0]?.total || 0),
      });

      return {
        users: safeParse(usersCount[0]?.count),
        videos: safeParse(videosCount[0]?.count),
        views: safeParse(viewsCount[0]?.total),
        usersEarnings: usersEarningsVal,
        afritokProfit: appProfitVal,
        today: safeParse(todayMoney[0]?.total),
        totalRevenue: usersEarningsVal + appProfitVal,
        totalWithdrawals: safeParse(paidWithdrawals[0]?.total),
        pendingWithdrawals: safeParse(pendingWithdrawalsResult[0]?.total),
      };
    } catch (err) {
      console.error("❌ ERREUR DASHBOARD :", err);
      throw err;
    }
  }),
});
