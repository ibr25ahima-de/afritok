import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import { sql } from "drizzle-orm";

import {
  users,
  videos,
  likes,
  comments,
  followers,
  earnings,
  withdrawals,
  otps,
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

/* =====================
USERS
===================== */

export async function upsertUser(user: Partial<InsertUser>) {
  // Use raw SQL to avoid Drizzle's auto-increment issues
  const phone = user.phone;
  const name = user.name || null;
  const email = user.email || null;
  const loginMethod = user.loginMethod || null;
  const role = user.role || "user";
  const lastSignedIn = user.lastSignedIn || new Date();
  const bio = user.bio || null;
  const avatarUrl = user.avatarUrl || null;
  const country = user.country || null;
  const currency = user.currency || null;
  const totalEarnings = user.totalEarnings || 0;
  const totalWithdrawals = user.totalWithdrawals || 0;

  // ✅ Use raw SQL to insert/update without touching id
  await db.execute(sql`
    INSERT INTO users (phone, name, email, loginMethod, role, bio, avatarUrl, country, currency, totalEarnings, totalWithdrawals, lastSignedIn)
    VALUES (${phone}, ${name}, ${email}, ${loginMethod}, ${role}, ${bio}, ${avatarUrl}, ${country}, ${currency}, ${totalEarnings}, ${totalWithdrawals}, ${lastSignedIn})
    ON CONFLICT (phone) DO UPDATE SET
      name = COALESCE(EXCLUDED.name, users.name),
      email = COALESCE(EXCLUDED.email, users.email),
      loginMethod = COALESCE(EXCLUDED.loginMethod, users.loginMethod),
      role = COALESCE(EXCLUDED.role, users.role),
      bio = COALESCE(EXCLUDED.bio, users.bio),
      avatarUrl = COALESCE(EXCLUDED.avatarUrl, users.avatarUrl),
      country = COALESCE(EXCLUDED.country, users.country),
      currency = COALESCE(EXCLUDED.currency, users.currency),
      totalEarnings = COALESCE(EXCLUDED.totalEarnings, users.totalEarnings),
      totalWithdrawals = COALESCE(EXCLUDED.totalWithdrawals, users.totalWithdrawals),
      lastSignedIn = ${lastSignedIn},
      updatedAt = NOW()
  `);
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

export async function getFeedVideos(limit = 20, offset = 0) {
  return db.select().from(videos).limit(limit).offset(offset);
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

// ✅ FIXED: Accept both phone and code parameters
export async function getValidOTP(phone: string, code?: string): Promise<InsertOTP | undefined> {
  const conditions = [eq(otps.phone, phone), gt(otps.expiresAt, new Date())];
  
  // If code is provided, also check that it matches
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

/* =====================
EARNINGS & WITHDRAWALS
===================== */

export async function getUserEarnings(userId: number) {
  return db.select().from(earnings).where(eq(earnings.userId, userId));
}

export async function getUserWithdrawals(userId: number) {
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId));
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
