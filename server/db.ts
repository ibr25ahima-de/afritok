import { eq, and, gt, desc, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { MONETIZATION } from "./monetization-config";

import {
  users,
  videos,
  likes,
  comments,
  followers,
  earnings,
  withdrawals,
  otps,
  favorites,
  shares,
  music,
  InsertUser,
  OTP,
} from "../drizzle/schema";

/* =====================
DATABASE
===================== */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);

/* =====================
USERS
===================== */

export async function upsertUser(user: Partial<InsertUser>) {
  if (!user.phone) throw new Error("Phone required");

  await db
    .insert(users)
    .values({
      phone: user.phone,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "phone_otp",
      role: user.role ?? "user",
      totalEarnings: 0,
      totalWithdrawals: 0,
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getUserById(userId: number) {
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function getUserByPhone(phone: string) {
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

/* =====================
VIDEOS
===================== */

export async function getVideoById(videoId: number) {
  return (await db.select().from(videos).where(eq(videos.id, videoId)).limit(1))[0];
}

export async function getFeedVideos(limit: number, offset: number) {
  const result = await db
    .select()
    .from(videos)
    .limit(limit)
    .offset(offset);
  return result;
}

export async function getUserVideos(userId: number) {
  return db.select().from(videos).where(eq(videos.userId, userId)).orderBy(desc(videos.createdAt));
}

/* =====================
OTP
===================== */

export async function createOTP(phone: string, code: string) {
  await db.insert(otps).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60000),
    attempts: 0,
  });
}

export async function getValidOTP(phone: string, code: string): Promise<OTP | undefined> {
  return (
    await db
      .select()
      .from(otps)
      .where(
        and(
          eq(otps.phone, phone),
          eq(otps.code, code),
          gt(otps.expiresAt, new Date())
        )
      )
      .limit(1)
  )[0];
}

export async function deleteOTP(id: number) {
  await db.delete(otps).where(eq(otps.id, id));
}

/* =====================
INTERACTIONS
===================== */

export async function getUserLike(userId: number, videoId: number) {
  return (
    await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1)
  )[0];
}

export async function likeVideo(userId: number, videoId: number) {
  const exists = await getUserLike(userId, videoId);
  if (exists) return;

  await db.insert(likes).values({ userId, videoId });

  await db
    .update(videos)
    .set({ likes: sql`${videos.likes} + 1` })
    .where(eq(videos.id, videoId));
}

export async function unlikeVideo(userId: number, videoId: number) {
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)));

  // ✅ SÉCURITÉ COMPTEUR (GREATEST)
  await db
    .update(videos)
    .set({ likes: sql`GREATEST(${videos.likes} - 1, 0)` })
    .where(eq(videos.id, videoId));
}

/* COMMENTS */

export async function getVideoComments(videoId: number) {
  return db.select().from(comments).where(eq(comments.videoId, videoId));
}

export async function addComment(userId: number, videoId: number, text: string) {
  await db.insert(comments).values({ userId, videoId, text });

  await db
    .update(videos)
    .set({ comments: sql`${videos.comments} + 1` })
    .where(eq(videos.id, videoId));
}

export async function deleteComment(commentId: number) {
  try {
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment[0]) return { success: false };

    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    // ✅ SÉCURITÉ COMPTEUR (GREATEST)
    await db
      .update(videos)
      .set({ comments: sql`GREATEST(${videos.comments} - 1, 0)` })
      .where(eq(videos.id, comment[0].videoId));

    return { success: true };
  } catch (error) {
    console.error("deleteComment error:", error);
    return { success: false };
  }
}

/* FAVORITES */

export async function getUserFavorite(userId: number, videoId: number) {
  return (
    await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .limit(1)
  )[0];
}

export async function favoriteVideo(userId: number, videoId: number) {
  const exists = await getUserFavorite(userId, videoId);
  if (exists) return;

  await db.insert(favorites).values({ userId, videoId });

  await db
    .update(videos)
    .set({ favorites: sql`${videos.favorites} + 1` })
    .where(eq(videos.id, videoId));
}

export async function unfavoriteVideo(userId: number, videoId: number) {
  try {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)));

    // ✅ SÉCURITÉ COMPTEUR (GREATEST)
    await db
      .update(videos)
      .set({ favorites: sql`GREATEST(${videos.favorites} - 1, 0)` })
      .where(eq(videos.id, videoId));
    
    return { success: true };
  } catch (error) {
    console.error("unfavoriteVideo error:", error);
    return { success: false };
  }
}

/* SHARES */

export async function shareVideo(userId: number, videoId: number, platform: string) {
  await db.insert(shares).values({ userId, videoId, platform });

  await db
    .update(videos)
    .set({ shares: sql`${videos.shares} + 1` })
    .where(eq(videos.id, videoId));
}

/* VIEWS */

export async function incrementVideoViews(videoId: number, userId?: number) {
  // 1. Incrémenter la vue
  await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId));

  // 2. Récupérer la vidéo
  const video = await getVideoById(videoId);
  if (!video) return;

  // 3. 👤 PAYER LE VIEWER
  if (userId) {
    await createEarning(userId, 0, "view", videoId);
  }

  // 4. 🎬 PAYER LE CRÉATEUR (plus important)
  if (video.userId && video.userId !== userId) {
    await createEarning(video.userId, 0, "creator_view", videoId);
  }
}
/* =====================
FOLLOW
===================== */

export async function isFollowing(followerId: number, followingId: number) {
  const res = await db
    .select()
    .from(followers)
    .where(
      and(
        eq(followers.followerId, followerId),
        eq(followers.followingId, followingId)
      )
    )
    .limit(1);

  return res.length > 0;
}

export async function getFollowerCount(userId: number) {
  return (await db.select().from(followers).where(eq(followers.followingId, userId))).length;
}

export async function getFollowingCount(userId: number) {
  return (await db.select().from(followers).where(eq(followers.followerId, userId))).length;
}

/* =====================
EARNINGS (FINAL)
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
      const video = await getVideoById(videoId);
      if (!video) return { success: false };

      if (video.userId === userId) {
        isCreator = true;
      }
    }

    // 🚨 6. Vérifier éligibilité créateur réelle
    if (isCreator) {
      const followersCount = await getFollowerCount(userId);

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
    const user = await getUserById(userId);
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
    const app = await getUserById(1);
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

/* =====================
WITHDRAWALS
===================== */

export async function getUserWithdrawals(userId: number) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
}

export async function createWithdrawalRecord(
  userId: number,
  amount: number,
  paymentMethod: string
) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  const balance = parseFloat(user.totalEarnings?.toString() || "0");

  if (amount > balance) throw new Error("Insufficient balance");

  await db.insert(withdrawals).values({
    userId,
    amount: amount.toFixed(2),
    paymentMethod,
    phone: user.phone,
    status: "completed",
  });
}

// =======================
// MISSING FUNCTIONS FIX
// =======================

// 💰 GET USER EARNINGS
export async function getUserEarnings(userId: number) {
  try {
    const user = await getUserById(userId);
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

export async function deleteUserAccount(userId: number) {
  // Supprimer les interactions
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(comments).where(eq(comments.userId, userId));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  await db.delete(shares).where(eq(shares.userId, userId));
  await db.delete(followers).where(eq(followers.followerId, userId));
  await db.delete(followers).where(eq(followers.followingId, userId));
  await db.delete(earnings).where(eq(earnings.userId, userId));
  await db.delete(withdrawals).where(eq(withdrawals.userId, userId));

  // Supprimer les vidéos
  await db.delete(videos).where(eq(videos.userId, userId));

  // Supprimer le compte
  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}

/* =====================
DISPLAY SETTINGS
===================== */

export async function getDisplaySettings(userId: number) {
  const user = await getUserById(userId);

  if (!user) {
    throw new Error("User not found");
  }

  return {
    language: user.language,
    darkMode: user.darkMode,
    dataSaver: user.dataSaver,
    autoPlay: user.autoPlay,
    textSize: user.textSize,
    animations: user.animations,
  };
}

export async function updateDisplaySettings(
  userId: number,
  settings: {
    language: string;
    darkMode: string;
    dataSaver: boolean;
    autoPlay: string;
    textSize: string;
    animations: boolean;
  }
) {
  await db
    .update(users)
    .set({
      language: settings.language,
      darkMode: settings.darkMode,
      dataSaver: settings.dataSaver,
      autoPlay: settings.autoPlay,
      textSize: settings.textSize,
      animations: settings.animations,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

/* =====================
PROFILE UPDATES
===================== */

export async function updateUserProfile(
  userId: number,
  data: {
    name: string;
    bio?: string;
    country?: string;
  }
) {
  await db
    .update(users)
    .set({
      name: data.name,
      bio: data.bio,
      country: data.country,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function updateUserAvatar(
  userId: number,
  avatarUrl: string
) {
  await db
    .update(users)
    .set({
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    avatarUrl,
  };
}

/* =====================
MUSIC
===================== */

export async function getAllMusic() {
  return await db
    .select()
    .from(music)
    .where(eq(music.isActive, true))
    .orderBy(desc(music.plays));
}
