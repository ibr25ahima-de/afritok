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

export async function incrementVideoViews(videoId: number) {
  await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId));
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
    // 🚨 LIMITES PAR TYPE (ANTI ABUS)
    const limits = MONETIZATION.dailyLimits;

    // Compter combien aujourd'hui
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayEarnings = await db
      .select()
      .from(earnings)
      .where(
        and(
          eq(earnings.userId, userId),
          eq(earnings.source, source),
          gt(earnings.createdAt, today)
        )
      );

    // ✅ DÉTAIL PROPRE (Typage Record<string, number>)
    if (todayEarnings.length >= ((limits as Record<string, number>)[source] || 20)) {
      return { success: false, shadow: true };
    }

    // ✅ FIX PROPRE (cleanSource pour éviter les undefined sur les suffixes _app)
    const cleanSource = source.replace("_app", "");
    const delay = MONETIZATION.antiSpam[cleanSource as keyof typeof MONETIZATION.antiSpam];

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

    // 🚨 2. Anti duplicate (même action même vidéo)
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

    if (existing.length > 0) {
      return { success: false, reason: "duplicate" };
    }

    // 🚨 3. Vérifier vidéo
    let isCreator = false;

    if (videoId) {
      const video = await getVideoById(videoId);
      if (!video) return { success: false };

      if (video.userId === userId) {
        isCreator = true;
      }
    }

    // 🚨 4. Vérifier éligibilité créateur réelle
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

    // 💰 5. Split argent
    // ✅ FIX PROPRE (Utilisation de cleanSource pour la récompense)
    const reward = (MONETIZATION.rewards.user as any)[cleanSource] || amount;
    const userAmount = (reward * 0.7).toFixed(4);
    const appAmount = (reward * 0.3).toFixed(4);

    // 💾 6. Save user
    await db.insert(earnings).values({
      userId,
      amount: userAmount,
      source,
      videoId: videoId || null,
    });

    // 💾 7. Save app
    await db.insert(earnings).values({
      userId: 1,
      amount: appAmount,
      source: `${source}_app`,
      videoId: videoId || null,
    });

    // 📊 8. Update total user
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

    // 📊 9. Update total app
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
    status: "completed",
  });
}

export async function getUserEarnings(userId: number) {
  try {
    const result = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(eq(earnings.userId, userId));

    const total = Number(result[0]?.total || 0);

    return {
      total,
      available: total,
      pending: 0,
    };
  } catch (error) {
    console.error("getUserEarnings error:", error);
    return null;
  }
}
