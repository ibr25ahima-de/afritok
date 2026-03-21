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
      loginMethod: user.loginMethod ?? null,
      role: user.role ?? "user",
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        loginMethod: user.loginMethod ?? undefined,
        lastSignedIn: new Date(),
      },
    });
}

export async function getUserById(id: number) {
  return (await db.select().from(users).where(eq(users.id, id)).limit(1))[0];
}

export async function getUserByPhone(phone: string) {
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

/* =====================
VIDEOS
===================== */

export async function getVideoById(id: number) {
  return (await db.select().from(videos).where(eq(videos.id, id)).limit(1))[0];
}

export async function getFeedVideos(limit = 20, offset = 0) {
  return db
    .select()
    .from(videos)
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

/* =====================
OTP
===================== */

export async function createOTP(phone: string, code: string) {
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  await db.insert(otps).values({
    phone,
    code,
    expiresAt,
    attempts: 0,
  });
}

export async function getValidOTP(phone: string, code: string): Promise<OTP | undefined> {
  return (
    await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), eq(otps.code, code), gt(otps.expiresAt, new Date())))
      .limit(1)
  )[0];
}

export async function deleteOTP(id: number) {
  await db.delete(otps).where(eq(otps.id, id));
}

/* =====================
INTERACTIONS
===================== */

export async function likeVideo(userId: number, videoId: number) {
  const existing = await db
    .select()
    .from(likes)
    .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
    .limit(1);

  if (existing.length > 0) return;

  await db.insert(likes).values({ userId, videoId });

  await db
    .update(videos)
    .set({ likes: (await getVideoById(videoId))!.likes! + 1 })
    .where(eq(videos.id, videoId));
}

export async function addComment(userId: number, videoId: number, text: string) {
  await db.insert(comments).values({ userId, videoId, text });

  await db
    .update(videos)
    .set({ comments: (await getVideoById(videoId))!.comments! + 1 })
    .where(eq(videos.id, videoId));
}

export async function shareVideo(userId: number, videoId: number, platform: string) {
  await db.insert(shares).values({ userId, videoId, platform });

  await db
    .update(videos)
    .set({ shares: (await getVideoById(videoId))!.shares! + 1 })
    .where(eq(videos.id, videoId));
}

/* =====================
FOLLOW
===================== */

export async function isFollowing(followerId: number, followingId: number) {
  const result = await db
    .select()
    .from(followers)
    .where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId)))
    .limit(1);

  return result.length > 0;
}

/* =====================
EARNINGS
===================== */

export async function createEarning(
  userId: number,
  amount: number,
  source: string,
  videoId?: number
) {
  await db.insert(earnings).values({
    userId,
    amount: amount.toString(),
    source,
    videoId: videoId || null,
  });

  const user = await getUserById(userId);
  if (user) {
    const total = parseFloat(user.totalEarnings?.toString() || "0") + amount;

    await db
      .update(users)
      .set({ totalEarnings: total.toFixed(2) })
      .where(eq(users.id, userId));
  }
}

export async function getUserEarnings(userId: number) {
  return db.select().from(earnings).where(eq(earnings.userId, userId));
}

/* =====================
WITHDRAWALS
===================== */

export async function createWithdrawal(userId: number, amount: number, method: string) {
  const user = await getUserById(userId);
  if (!user) throw new Error("User not found");

  const balance = parseFloat(user.totalEarnings?.toString() || "0");
  if (amount > balance) throw new Error("Insufficient balance");

  await db
    .update(users)
    .set({ totalEarnings: (balance - amount).toFixed(2) })
    .where(eq(users.id, userId));

  await db.insert(withdrawals).values({
    userId,
    amount: amount.toString(),
    paymentMethod: method,
    status: "completed",
  });
}
