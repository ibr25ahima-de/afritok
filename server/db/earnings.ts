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
    // 🔥 1. LIMITE GLOBALE (anti faillite)
    const GLOBAL_DAILY_LIMIT = 20; // ≈ 12 000 FCFA

    const todayGlobal = new Date();
    todayGlobal.setHours(0, 0, 0, 0);

    const totalTodayResult = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, todayGlobal));

    const totalToday = Number(totalTodayResult[0]?.total || 0);

    if (totalToday >= GLOBAL_DAILY_LIMIT) {
      return { success: false, reason: "global_limit" };
    }

    // 🔥 2. PLAFOND PAR UTILISATEUR (réel - argent total)
    const USER_DAILY_LIMIT = 2;   // ≈ 1200 FCFA

    const todayUser = new Date();
    todayUser.setHours(0, 0, 0, 0);

    const userTodayResult = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          gt(earnings.createdAt, todayUser)
        )
      );

    const userTotalToday = Number(userTodayResult[0]?.total || 0);

    if (userTotalToday >= USER_DAILY_LIMIT) {
      return { success: false, reason: "user_limit" };
    }

    // 🚨 3. LIMITES PAR TYPE (nombre d'actions)
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

    // ✅ DÉTAIL PROPRE (Typage Record<string, number>)
    if (todayEarnings.length >= ((limits as Record<string, number>)[source] || 20)) {
      return { success: false, shadow: true };
    }

    // ✅ FIX PROPRE (cleanSource pour éviter les undefined sur les suffixes _app)
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
        const now = Date.now();

        if (now - lastTime < delay) {
          return { success: false, reason: "too_fast" };
        }
      }
    }

    // 🚨 4. Anti duplicate (même action même vidéo)
    const existing = await db
      .select()
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          eq(earnings.source, source),
          eq(earnings.videoId, videoId || null)
        )
      )
      .limit(1);

    /*
    if (existing.length > 0) {
      return { success: false, reason: "duplicate" };
    }
    */

    // 🚨 5. Vérifier vidéo
    let isCreator = false;

    if (videoId) {
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

      const views30Days = Number(viewsResult[0]?.total || 0);

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

    // LOG (garde ça)
    console.log("EARNING:", { userId, source, reward });

    const userAmount = (reward * 0.7).toFixed(4);
    const appAmount = (reward * 0.3).toFixed(4);

    // 💾 8. Save user
    await db.insert(earnings).values({
      userId,
      amount: userAmount,
      source,
      videoId: videoId || null,
    });

    // 💾 9. Save app
    await db.insert(earnings).values({
      userId: 1,
      amount: appAmount,
      source: `${source}_app`,
      videoId: videoId || null,
    });

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

    // 📊 11. Update total app
    const app = (
      await db.select().from(users).where(eq(users.id, 1)).limit(1)
    )[0];
    if (app) {
      const newTotal = (
        parseFloat(app.totalEarnings?.toString() || "0") +
        parseFloat(appAmount)
      ).toFixed(2);

      await db
        .update(users)
        .set({ totalEarnings: newTotal })
        .where(eq(users.id, 1));
    }

    return { success: true };
  } catch (err) {
    console.error("[EARNING ERROR]", err);
    throw err;
  }
}

export async function getUserEarnings(userId: number) {
  try {
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
        total: sql<number>`COALESCE(SUM(${earnings.amount}), 0)`,
        transactions: sql<number>`COUNT(*)`,
      })
      .from(earnings);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayResult = await db
      .select({
        today: sql<number>`COALESCE(SUM(${earnings.amount}), 0)`,
      })
      .from(earnings)
      .where(gt(earnings.createdAt, today));

    return {
      total: Number(result[0]?.total || 0),
      today: Number(todayResult[0]?.today || 0),
      transactions: Number(result[0]?.transactions || 0),
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
