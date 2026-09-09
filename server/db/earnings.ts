import { eq, and, gt, desc, sql } from "drizzle-orm";
import { db } from "./index";
import {
  earnings,
  users,
  videos,
  followers,
} from "../../drizzle/schema";
import { MONETIZATION } from "../monetization-config";

/* =====================
EARNINGS
===================== */

export async function createEarning(
  userId: number,
  amount: number,
  source: string,
  videoId?: number
) {
  try {
    if (!Number.isSafeInteger(userId) || userId <= 0) {
      return { success: false, reason: "invalid_user" };
    }
    if (!Number.isFinite(amount) || amount < 0 || amount > 1000) {
      return { success: false, reason: "invalid_amount" };
    }
    if (typeof source !== "string" || source.trim().length < 1 || source.length > 64) {
      return { success: false, reason: "invalid_source" };
    }
    if (videoId !== undefined && (!Number.isSafeInteger(videoId) || videoId <= 0)) {
      return { success: false, reason: "invalid_video" };
    }

    // 🔥 1. LIMITE GLOBALE (anti faillite)
    const GLOBAL_DAILY_LIMIT = 20;

    const todayGlobal = new Date();
    todayGlobal.setHours(0, 0, 0, 0);

    const totalTodayResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, todayGlobal));

    const totalToday = parseFloat(totalTodayResult[0]?.total || "0") || 0;

    if (totalToday >= GLOBAL_DAILY_LIMIT) {
      return { success: false, reason: "global_limit" };
    }

    // 🔥 2. PLAFOND PAR UTILISATEUR
    const USER_DAILY_LIMIT = 2;

    const todayUser = new Date();
    todayUser.setHours(0, 0, 0, 0);

    const userTodayResult = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          gt(earnings.createdAt, todayUser)
        )
      );

    const userTotalToday = parseFloat(userTodayResult[0]?.total || "0") || 0;

    if (userTotalToday >= USER_DAILY_LIMIT) {
      return { success: false, reason: "user_limit" };
    }

    // 🚨 3. LIMITES PAR TYPE
    const limits = MONETIZATION.dailyLimits;

    const todayEarnings = await db
      .select()
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          eq(earnings.source, source),
          gt(earnings.createdAt, todayUser)
        )
      );

    if (todayEarnings.length >= ((limits as Record<string, number>)[source] || 20)) {
      return { success: false, shadow: true };
    }

    const cleanSource = source.replace("_app", "");
    const delay =
      MONETIZATION.antiSpam[
        cleanSource as keyof typeof MONETIZATION.antiSpam
      ];

    if (delay) {
      const last = await db
        .select()
        .from(earnings)
        .where(
          and(
            eq(earnings.userId, userId),
            eq(earnings.source, source)
          )
        )
        .orderBy(desc(earnings.createdAt))
        .limit(1);

      if (last[0]) {
        const lastTime = new Date(last[0].createdAt).getTime();
        if (Date.now() - lastTime < delay) {
          return { success: false, reason: "too_fast" };
        }
      }
    }

    // 🚨 4. Anti-replay: une même action ne peut pas être récompensée deux fois.
    if (videoId !== undefined) {
      const existing = await db
        .select({ id: earnings.id })
        .from(earnings)
        .where(
          and(
            eq(earnings.userId, userId),
            eq(earnings.source, source),
            eq(earnings.videoId, videoId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        return { success: false, reason: "duplicate" };
      }
    }

    // 🚨 5. Vérifier vidéo
    let isCreator = false;

    if (videoId !== undefined) {
      const video = await db
        .select()
        .from(videos)
        .where(eq(videos.id, videoId))
        .limit(1);
      const videoData = video[0];
      if (!videoData) return { success: false };

      if (videoData.userId === userId) {
        isCreator = true;
      }
    }

    // 🚨 6. Vérifier éligibilité créateur réelle
    if (isCreator) {
      const followersCount = (
        await db
          .select()
          .from(followers)
          .where(eq(followers.followingId, userId))
      ).length;

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const viewsResult = await db
        .select({
          total: sql<number>`SUM(${videos.views})`,
        })
        .from(videos)
        .where(
          and(
            eq(videos.userId, userId),
            gt(videos.createdAt, thirtyDaysAgo)
          )
        );

      const views30Days = parseFloat(viewsResult[0]?.total || "0") || 0;

      const eligible =
        followersCount >= MONETIZATION.creator.minFollowers &&
        views30Days >= MONETIZATION.creator.minViews30Days;

      if (!eligible) {
        return { success: false, reason: "creator_not_eligible" };
      }
    }

    // 💰 7. Split argent
    let reward = amount;

    if (source === "creator_view") {
      reward = MONETIZATION.rewards.creator_view;
    } else {
      reward =
        MONETIZATION.rewards[
          cleanSource as keyof typeof MONETIZATION.rewards
        ] || amount;
    }

    if (!Number.isFinite(reward) || reward < 0 || reward > 1000) {
      return { success: false, reason: "invalid_reward" };
    }

    const userAmount = (reward * 0.7).toFixed(4);
    const appAmount = (reward * 0.3).toFixed(4);

    // 💾 8. Save user
    await db.insert(earnings).values({
      userId,
      amount: userAmount,
      source,
      videoId: videoId ?? null,
    });

    // 💾 9. Save platform share against a real admin account, never a hardcoded user ID.
    const [platformAdmin] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "admin"))
      .limit(1);

    if (platformAdmin && parseFloat(appAmount) > 0) {
      await db.insert(earnings).values({
        userId: platformAdmin.id,
        amount: appAmount,
        source: `${source}_app`,
        videoId: videoId ?? null,
      });
    }

    // 📊 10. Update total user
    const user = (
      await db.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
    if (user) {
      const newTotal = (
        parseFloat(user.totalEarnings?.toString() || "0") +
        parseFloat(userAmount)
      ).toFixed(2);

      await db
        .update(users)
        .set({ totalEarnings: newTotal })
        .where(eq(users.id, userId));
    }

    // 📊 11. Update platform admin total only when an admin account exists.
    if (platformAdmin && parseFloat(appAmount) > 0) {
      const app = (
        await db.select().from(users).where(eq(users.id, platformAdmin.id)).limit(1)
      )[0];
      if (app) {
        const newTotal = (
          parseFloat(app.totalEarnings?.toString() || "0") +
          parseFloat(appAmount)
        ).toFixed(2);

        await db
          .update(users)
          .set({ totalEarnings: newTotal })
          .where(eq(users.id, platformAdmin.id));
      }
    }

    return { success: true };
  } catch (err) {
    console.error("[EARNING ERROR]", err);
    throw err;
  }
}

export async function getUserEarnings(userId: number) {
  try {
    if (!Number.isSafeInteger(userId) || userId <= 0) return null;
    const user = (
      await db.select().from(users).where(eq(users.id, userId)).limit(1)
    )[0];
    if (!user) return null;

    return {
      total: parseFloat(user.totalEarnings?.toString() || "0"),
      available: parseFloat(user.totalEarnings?.toString() || "0"),
      pending: 0,
    };
  } catch (error) {
    console.error("getUserEarnings error:", error);
    return null;
  }
}

export async function getPlatformStats() {
  try {
    const result = await db
      .select({
        total: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
        transactions: sql<number>`COUNT(*)`,
      })
      .from(earnings);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await db
      .select({
        today: sql<string>`COALESCE(SUM(CAST(${earnings.amount} AS double precision)), 0)`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, today));

    return {
      total: parseFloat(result[0]?.total || "0") || 0,
      today: parseFloat(todayResult[0]?.today || "0") || 0,
      transactions: parseFloat(String(result[0]?.transactions || 0)) || 0,
    };
  } catch (error) {
    console.error("getPlatformStats error:", error);

    return {
      total: 0,
      today: 0,
      transactions: 0,
    };
  }
}
