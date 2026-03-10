import { eq, and, gt, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

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
  InsertOTP,
} from "../drizzle/schema";

/* =====================
DATABASE CONNECTION
===================== */

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const db = drizzle(pool);
async function runMigrations() {
  console.log("[Migrations] Creating database tables...");

  await db.execute(`
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
  `);

  await db.execute(`
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS likes INTEGER DEFAULT 0;
  `);

  await db.execute(`
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS comments INTEGER DEFAULT 0;
  `);

  await db.execute(`
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0;
  `);

  await db.execute(`
  ALTER TABLE videos ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;
  `);

  console.log("✅ Database tables created successfully");
}

runMigrations();
/* =====================
USERS
===================== */

export async function upsertUser(user: Partial<InsertUser>) {
  // ✅ If ID exists → update only
  if (user.id) {
    await db
      .update(users)
      .set({
        ...user,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    return;
  }

  // ✅ If creating user → phone is required
  if (!user.phone) {
    throw new Error("Phone is required to create a user");
  }

  await db
    .insert(users)
    .values({
      phone: user.phone,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? "user",
      bio: user.bio ?? null,
      avatarUrl: user.avatarUrl ?? null,
      country: user.country ?? null,
      currency: user.currency ?? null,
      totalEarnings: user.totalEarnings ?? 0,
      totalWithdrawals: user.totalWithdrawals ?? 0,
      lastSignedIn: user.lastSignedIn ?? new Date(),
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        loginMethod: user.loginMethod ?? undefined,
        role: user.role ?? undefined,
        bio: user.bio ?? undefined,
        avatarUrl: user.avatarUrl ?? undefined,
        country: user.country ?? undefined,
        currency: user.currency ?? undefined,
        totalEarnings: user.totalEarnings ?? undefined,
        totalWithdrawals: user.totalWithdrawals ?? undefined,
        lastSignedIn: user.lastSignedIn ?? new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getUserById(userId: number) {
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function getUserByPhone(phone: string) {
  return (
    await db.select().from(users).where(eq(users.phone, phone)).limit(1)
  )[0];
}

/* =====================
VIDEOS
===================== */

export async function getVideoById(videoId: number) {
  return (
    await db.select().from(videos).where(eq(videos.id, videoId)).limit(1)
  )[0];
}

export async function getFeedVideos(limit = 20, offset = 0, tab: "forYou" | "following" = "forYou") {
  // For now, return all public videos ordered by newest first
  // TODO: Implement "following" tab to show only videos from followed users
  return db
    .select()
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserVideos(userId: number) {
  return db.select().from(videos).where(eq(videos.userId, userId));
}

/* =====================
LIKES & COMMENTS
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

export async function getVideoComments(videoId: number) {
  return db.select().from(comments).where(eq(comments.videoId, videoId));
}

/* =====================
OTP
===================== */

export async function createOTP(
  phone: string,
  code: string,
  expiresInMinutes = 10
) {
  const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

  await db.insert(otps).values({
    phone,
    code,
    attempts: 0,
    expiresAt,
  });

  console.log(`[OTP] ${phone} -> ${code}`);
}

export async function getValidOTP(
  phone: string,
  code?: string
): Promise<InsertOTP | undefined> {
  const conditions = [
    eq(otps.phone, phone),
    gt(otps.expiresAt, new Date()),
  ];

  if (code) {
    conditions.push(eq(otps.code, code));
  }

  return (
    await db
      .select()
      .from(otps)
      .where(and(...conditions))
      .limit(1)
  )[0];
}

export async function deleteOTP(otpId: number) {
  await db.delete(otps).where(eq(otps.id, otpId));
}

export async function incrementOTPAttempts(otpId: number) {
  const otp = (
    await db.select().from(otps).where(eq(otps.id, otpId)).limit(1)
  )[0];

  if (!otp) return;

  await db
    .update(otps)
    .set({ attempts: otp.attempts + 1 })
    .where(eq(otps.id, otpId));
}

/* =====================
FOLLOWERS
===================== */

export async function getFollowerCount(userId: number) {
  return (
    await db
      .select()
      .from(followers)
      .where(eq(followers.followingId, userId))
  ).length;
}

export async function getFollowingCount(userId: number) {
  return (
    await db
      .select()
      .from(followers)
      .where(eq(followers.followerId, userId))
  ).length;
}

export async function isFollowing(
  followerId: number,
  followingId: number
): Promise<boolean> {
  const result = await db
    .select()
    .from(followers)
    .where(
      and(
        eq(followers.followerId, followerId),
        eq(followers.followingId, followingId)
      )
    )
    .limit(1);

  return result.length > 0;
}

/* =====================
EARNINGS & WITHDRAWALS
===================== */

export async function getUserEarnings(userId: number) {
  return db.select().from(earnings).where(eq(earnings.userId, userId));
}

export async function getUserWithdrawals(userId: number) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
}

/* =====================
LIKES - INTERACTIONS
===================== */

export async function likeVideo(userId: number, videoId: number) {
  // Check if already liked
  const existingLike = await getUserLike(userId, videoId);
  if (existingLike) return;

  // Add like
  await db.insert(likes).values({ userId, videoId });

  // Increment video likes counter
  const video = await getVideoById(videoId);
  if (video) {
    await db
      .update(videos)
      .set({ likes: (video.likes || 0) + 1 })
      .where(eq(videos.id, videoId));
  }
}

export async function unlikeVideo(userId: number, videoId: number) {
  // Remove like
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)));

  // Decrement video likes counter
  const video = await getVideoById(videoId);
  if (video && video.likes > 0) {
    await db
      .update(videos)
      .set({ likes: video.likes - 1 })
      .where(eq(videos.id, videoId));
  }
}

/* =====================
FAVORITES - INTERACTIONS
===================== */

export async function favoriteVideo(userId: number, videoId: number) {
  // Check if already favorited
  const existing = await db
    .select()
    .from(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
    .limit(1);

  if (existing.length > 0) return;

  // Add favorite
  await db.insert(favorites).values({ userId, videoId });

  // Increment video favorites counter
  const video = await getVideoById(videoId);
  if (video) {
    await db
      .update(videos)
      .set({ favorites: (video.favorites || 0) + 1 })
      .where(eq(videos.id, videoId));
  }
}

export async function unfavoriteVideo(userId: number, videoId: number) {
  // Remove favorite
  await db
    .delete(favorites)
    .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)));

  // Decrement video favorites counter
  const video = await getVideoById(videoId);
  if (video && video.favorites > 0) {
    await db
      .update(videos)
      .set({ favorites: video.favorites - 1 })
      .where(eq(videos.id, videoId));
  }
}

export async function getUserFavorite(userId: number, videoId: number) {
  return (
    await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .limit(1)
  )[0];
}

/* =====================
COMMENTS - INTERACTIONS
===================== */

export async function addComment(userId: number, videoId: number, text: string) {
  // Add comment
  await db.insert(comments).values({ userId, videoId, text });

  // Increment video comments counter
  const video = await getVideoById(videoId);
  if (video) {
    await db
      .update(videos)
      .set({ comments: (video.comments || 0) + 1 })
      .where(eq(videos.id, videoId));
  }
}

export async function deleteComment(commentId: number) {
  // Get comment first
  const comment = (await db.select().from(comments).where(eq(comments.id, commentId)).limit(1))[0];
  if (!comment) return;

  // Delete comment
  await db.delete(comments).where(eq(comments.id, commentId));

  // Decrement video comments counter
  const video = await getVideoById(comment.videoId);
  if (video && video.comments > 0) {
    await db
      .update(videos)
      .set({ comments: video.comments - 1 })
      .where(eq(videos.id, comment.videoId));
  }
}

/* =====================
SHARES - INTERACTIONS
===================== */

export async function shareVideo(userId: number, videoId: number, platform: string) {
  // Add share
  await db.insert(shares).values({ userId, videoId, platform });

  // Increment video shares counter
  const video = await getVideoById(videoId);
  if (video) {
    await db
      .update(videos)
      .set({ shares: (video.shares || 0) + 1 })
      .where(eq(videos.id, videoId));
  }
}

/* =====================
VIEWS - INTERACTIONS
===================== */

export async function incrementVideoViews(videoId: number) {
  const video = await getVideoById(videoId);
  if (video) {
    await db
      .update(videos)
      .set({ views: (video.views || 0) + 1 })
      .where(eq(videos.id, videoId));
  }
}
