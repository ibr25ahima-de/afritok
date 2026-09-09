import { router, adminProcedure } from "../../_core/trpc";
import { db } from "../../db";
import { users, videos, earnings, withdrawals } from "../../../drizzle/schema";
import { eq, gt, sql } from "drizzle-orm";

function safeParse(val: unknown): number {
  if (val === null || val === undefined) return 0;
  const parsed = typeof val === "number" ? val : parseFloat(String(val));
  return Number.isFinite(parsed) ? parsed : 0;
}

export const dashboardRouter = router({
  getDashboardStats: adminProcedure.query(async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const usersCount = await db.select({ count: sql<number>`COUNT(*)` }).from(users);
    const videosCount = await db.select({ count: sql<number>`COUNT(*)` }).from(videos);
    const viewsCount = await db.select({ total: sql<number>`COALESCE(SUM(${videos.views}),0)` }).from(videos);

    // Digital creator earnings and AfriTok's digital share are separated by the
    // recipient's server-side role; no magic user ID is trusted.
    const creatorEarnings = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)` })
      .from(earnings)
      .leftJoin(users, eq(earnings.userId, users.id))
      .where(sql`${users.role} IS DISTINCT FROM 'admin'`);

    const platformEarnings = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)` })
      .from(earnings)
      .innerJoin(users, eq(earnings.userId, users.id))
      .where(eq(users.role, "admin"));

    const todayMoney = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)` })
      .from(earnings)
      .where(gt(earnings.createdAt, today));

    const paidWithdrawals = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${withdrawals.amount} AS double precision)), 0)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "paid"));

    const pendingWithdrawals = await db
      .select({ total: sql<string>`COALESCE(SUM(CAST(${withdrawals.amount} AS double precision)), 0)` })
      .from(withdrawals)
      .where(eq(withdrawals.status, "pending"));

    const usersEarningsVal = safeParse(creatorEarnings[0]?.total);
    const appProfitVal = safeParse(platformEarnings[0]?.total);

    return {
      users: safeParse(usersCount[0]?.count),
      videos: safeParse(videosCount[0]?.count),
      views: safeParse(viewsCount[0]?.total),
      usersEarnings: usersEarningsVal,
      afritokProfit: appProfitVal,
      today: safeParse(todayMoney[0]?.total),
      totalRevenue: usersEarningsVal + appProfitVal,
      totalWithdrawals: safeParse(paidWithdrawals[0]?.total),
      pendingWithdrawals: safeParse(pendingWithdrawals[0]?.total),
    };
  }),
});
