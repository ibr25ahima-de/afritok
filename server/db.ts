import { eq, and, gt, desc, sql, ne } from "drizzle-orm";
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

export async function incrementVideoViews(videoId: number, userId?: number) {
  // 1. Incrémenter la vue
  await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId));

  // 2. Récupérer la vidéo
  const video = await getVideoById(videoId);
  if (!video) return;

  // 🔒 anti-spam simple (1 vue / 30 secondes / vidéo)
  const recentView = await db
    .select()
    .from(earnings)
    .where(
      and(
        eq(earnings.userId, userId || 0),
        eq(earnings.videoId, videoId),
        gt(earnings.createdAt, new Date(Date.now() - 30000))
      )
    )
    .limit(1);

  if (recentView.length > 0) return;

  // 3. 👤 PAYER LE VIEWER
  if (userId) {
    await createEarning(userId, 0.2, "view", videoId);
  }

  // 4. 🎬 PAYER LE CRÉATEUR (plus important)
  if (video.userId && video.userId !== userId) {
    await createEarning(video.userId, 0.5, "creator_view", videoId);
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
  console.log("💰 CREATE EARNING CALLED", {
    userId,
    amount,
    source,
  });
  
  if (amount <= 0) return;

  try {
    // 🔥 1. LIMITE GLOBALE (anti faillite)
    const GLOBAL_DAILY_LIMIT = 999999;

    const todayGlobal = new Date();
    todayGlobal.setHours(0, 0, 0, 0);

    const totalTodayResult = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(
        and(
          gt(earnings.createdAt, todayGlobal),
          ne(earnings.source, "platform_fee")
        )
      );

    const totalToday = Number(totalTodayResult[0]?.total || 0);

    if (totalToday >= GLOBAL_DAILY_LIMIT) {
      console.log("🚫 GLOBAL LIMIT HIT", totalToday);
      return { success: false, reason: "global_limit" };
    }

    // 🔥 2. PLAFOND PAR UTILISATEUR (réel - argent total)
    const USER_DAILY_LIMIT = 100;   // ✅ AUGMENTÉ À 100

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
          gt(earnings.createdAt, todayUser),
          ne(earnings.source, "platform_fee")
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

    // ✅ BLOC DÉSACTIVÉ (DEBUG)
    /*
    if (todayEarnings.length >= ((limits as Record<string, number>)[source] || 20)) {
      return { success: false, shadow: true };
    }
    */

    // ✅ FIX PROPRE (cleanSource pour éviter les undefined sur les suffixes _app)
    const cleanSource = source.replace("_app", "");
    
    // 🚨 4. Vérifier éligibilité créateur réelle
    // [Simulé pour la structure du fichier]
    const eligible = true; // ✅ TEMPORAIRE: autoriser tous les créateurs
    if (!eligible) {
       // return { success: false, reason: "creator_not_eligible" };
    }

    // 🏦 3. Séparation des gains (Utilisateur vs Plateforme)
    const PLATFORM_FEE = 0.3;
    const userAmount = amount * (1 - PLATFORM_FEE);
    const platformAmount = amount * PLATFORM_FEE;

    // 🔒 TRANSACTION SÉCURISÉE
    await db.transaction(async (tx) => {
      // 👤 UTILISATEUR
      await tx.insert(earnings).values({
        userId,
        amount: userAmount.toString(),
        source,
        videoId: videoId || null,
      });

      // 💰 PLATEFORME (TON ARGENT)
      await tx.insert(earnings).values({
        userId: 0, // ID spécial plateforme
        amount: platformAmount.toString(),
        source: "platform_fee",
        videoId: videoId || null,
      });

      // ✅ MISE À JOUR SOLDE UTILISATEUR (OBLIGATOIRE POUR RETRAITS)
      await tx.update(users)
        .set({
          totalEarnings: sql`${users.totalEarnings} + ${userAmount}`
        })
        .where(eq(users.id, userId));
    });

    return { success: true };

  } catch (error) {
    console.error("createEarning error:", error);
    return { success: false };
  }
}

// =======================
// FIX MISSING EXPORTS
// =======================

// 💰 GET USER EARNINGS
export async function getUserEarnings(userId: number) {
  try {
    const user = await getUserById(userId);
    if (!user) return null;

    const total = Number(user.totalEarnings || 0);
    const withdrawn = Number(user.totalWithdrawals || 0);

    return {
      total: total + withdrawn,
      available: total,
      withdrawn: withdrawn,
      pending: 0,
    };
  } catch (error) {
    console.error("getUserEarnings error:", error);
    return null;
  }
}

// 💸 GET USER WITHDRAWALS
export async function getUserWithdrawals(userId: number) {
  return db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt));
}

// 💳 CREATE WITHDRAWAL
export async function createWithdrawalRecord(
  userId: number,
  amount: number,
  paymentMethod: string,
  phone: string
) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  const balance =
    Number(user.totalEarnings || 0) -
    Number(user.totalWithdrawals || 0);

  if (amount <= 0) {
    throw new Error("Invalid amount");
  }

  if (amount > balance) {
    throw new Error("Insufficient balance");
  }

  // ⚡ ÉTAPE 1 — BLOQUER LES RETRAITS EN DOUBLE
  const existingPending = await db
    .select()
    .from(withdrawals)
    .where(
      and(
        eq(withdrawals.userId, userId),
        eq(withdrawals.status, "pending")
      )
    )
    .limit(1);

  if (existingPending.length > 0) {
    console.warn("🚨 FRAUD ATTEMPT", {
      userId,
      reason: "pending_withdrawal",
    });
    throw new Error("Withdrawal already in progress");
  }
  console.log("STEP 1 OK");

  // ⚡ ÉTAPE 2 — LIMITER LES RETRAITS PAR JOUR
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const todayWithdrawals = await db
    .select()
    .from(withdrawals)
    .where(
      and(
        eq(withdrawals.userId, userId),
        gt(withdrawals.createdAt, today)
      )
    );

  // ✅ DÉSACTIVÉ POUR TEST
  /*
  if (todayWithdrawals.length >= 3) {
    console.warn("🚨 FRAUD ATTEMPT", {
      userId,
      reason: "daily_limit_reached",
    });
    throw new Error("Daily withdrawal limit reached");
  }
  */
  console.log("STEP 2 OK");

  // ⚡ ÉTAPE 3 — MINIMUM ANTI-SPAM
  const lastWithdrawal = await db
    .select()
    .from(withdrawals)
    .where(eq(withdrawals.userId, userId))
    .orderBy(desc(withdrawals.createdAt))
    .limit(1);

  if (lastWithdrawal[0]) {
    const lastTime = new Date(lastWithdrawal[0].createdAt).getTime();
    const now = Date.now();

    // ✅ DÉSACTIVÉ POUR TEST
    /*
    if (now - lastTime < 60000) {
      console.warn("🚨 FRAUD ATTEMPT", {
        userId,
        reason: "spam_withdrawal",
      });
      throw new Error("Please wait before another withdrawal");
    }
    */
  }
  console.log("STEP 3 OK");

  // 🔒 TRANSACTION (OBLIGATOIRE)
  console.log("🚀 START TRANSACTION");
  await db.transaction(async (tx) => {

    // 1. 💸 CRÉER LE RETRAIT (marqué 'completed' pour le test de validation immédiate)
    await tx.insert(withdrawals).values({
      userId,
      amount: amount.toString(),
      paymentMethod,
      phone,
      status: "completed", 
    });

    // 2. 💰 DÉDUIRE LE SOLDE
    await tx.update(users)
      .set({
        totalEarnings: sql`GREATEST(${users.totalEarnings} - ${amount}, 0)`,
        totalWithdrawals: sql`${users.totalWithdrawals} + ${amount}`,
      })
      .where(eq(users.id, userId));
  });

  const updatedUser = await getUserById(userId);
  console.log("💸 AFTER WITHDRAW:", updatedUser);

  return { success: true };
}

// 💰 PLATFORM TOTAL
export async function getPlatformEarnings() {
  try {
    const result = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(eq(earnings.source, "platform_fee"));

    return Number(result[0]?.total || 0);
  } catch (error) {
    console.error("getPlatformEarnings error:", error);
    return 0;
  }
}

// 💰 PLATFORM TODAY
export async function getPlatformEarningsToday() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  try {
    const result = await db
      .select({
        total: sql<number>`SUM(${earnings.amount})`,
      })
      .from(earnings)
      .where(
        and(
          eq(earnings.source, "platform_fee"),
          gt(earnings.createdAt, today)
        )
      );

    return Number(result[0]?.total || 0);
  } catch (error) {
    console.error("getPlatformEarningsToday error:", error);
    return 0;
  }
}

/* 📊 PLATFORM STATS */
export async function getPlatformStats() {
  const total = await getPlatformEarnings();
  const today = await getPlatformEarningsToday();

  const count = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(earnings)
    .where(eq(earnings.source, "platform_fee"));

  return {
    total,
    today,
    transactions: Number(count[0]?.count || 0),
  };
}

/* 💰 LOG PLATFORM MONEY */
export async function logPlatformMoney() {
  const stats = await getPlatformStats();

  console.log("\n💰 ===== ARGENT PLATEFORME =====");
  console.log("💵 Total gagné :", stats.total.toFixed(2));
  console.log("📅 Aujourd’hui :", stats.today.toFixed(2));
  console.log("🔄 Transactions :", stats.transactions);

  if (stats.today > 0) {
    console.log("📈 Croissance active");
  } else {
    console.log("⚠️ Aucune activité");
  }

  console.log("================================\n");
}

// 🔥 AUTO FIX DB (TEMPORAIRE)
export async function fixDatabase() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        amount TEXT NOT NULL,
        "paymentMethod" TEXT NOT NULL,
        phone TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        "createdAt" TIMESTAMP DEFAULT NOW(),
        "updatedAt" TIMESTAMP DEFAULT NOW()
      );
    `);

    console.log("✅ withdrawals table ready");
  } catch (err) {
    console.error("❌ DB FIX ERROR:", err);
  }
        }
