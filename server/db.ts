import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../drizzle/schema";
import { eq, desc, sql, and } from "drizzle-orm";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not set");
}

const client = postgres(connectionString);
export const db = drizzle(client, { schema });

// ✅ FORCE ADMIN PROMOTION ON STARTUP
async function ensureAdmin() {
  try {
    const phone = "+225 05 64 19 41 33";
    console.log(`🚀 [DB] Checking admin status for ${phone}...`);
    
    const user = await db
      .select()
      .from(schema.users)
      .where(eq(schema.users.phone, phone))
      .limit(1);

    if (user.length > 0 && user[0].role !== "admin") {
      console.log(`🛠️ [DB] Promoting ${user[0].name} to admin...`);
      await db
        .update(schema.users)
        .set({ role: "admin" })
        .where(eq(schema.users.id, user[0].id));
      console.log(`✅ [DB] Promotion successful.`);
    } else if (user.length === 0) {
      console.log(`⚠️ [DB] User with phone ${phone} not found in database yet.`);
    } else {
      console.log(`✅ [DB] User is already admin.`);
    }
  } catch (e) {
    console.error(`❌ [DB] Admin promotion error:`, e);
  }
}

// Run promotion check
ensureAdmin();

// --- Helper Functions ---

export async function getUserByPhone(phone: string) {
  const result = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.phone, phone));
  return result[0];
}

export async function upsertUser(userData: any) {
  return await db
    .insert(schema.users)
    .values(userData)
    .onConflictDoUpdate({
      target: schema.users.phone,
      set: {
        ...userData,
        lastSignedIn: new Date(),
      },
    });
}

export async function updateUserProfile(userId: number, data: any) {
  return await db
    .update(schema.users)
    .set(data)
    .where(eq(schema.users.id, userId));
}

export async function updateUserAvatar(userId: number, avatarUrl: string) {
  return await db
    .update(schema.users)
    .set({ avatarUrl })
    .where(eq(schema.users.id, userId));
}

// OTP Helpers
export async function createOTP(phone: string, code: string) {
  return await db.insert(schema.otps).values({
    phone,
    code,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 mins
  });
}

export async function getValidOTP(phone: string, code: string) {
  const result = await db
    .select()
    .from(schema.otps)
    .where(
      and(
        eq(schema.otps.phone, phone),
        eq(schema.otps.code, code),
        sql`${schema.otps.expiresAt} > now()`
      )
    );
  return result[0];
}

export async function deleteOTP(id: number) {
  return await db.delete(schema.otps).where(eq(schema.otps.id, id));
}

export async function incrementOTPAttempts(id: number) {
  return await db
    .update(schema.otps)
    .set({ attempts: sql`${schema.otps.attempts} + 1` })
    .where(eq(schema.otps.id, id));
}

// Video Helpers
export async function getFeedVideos(limit: number, offset: number) {
  return await db
    .select({
      id: schema.videos.id,
      userId: schema.videos.userId,
      title: schema.videos.title,
      description: schema.videos.description,
      videoUrl: schema.videos.videoUrl,
      thumbnailUrl: schema.videos.thumbnailUrl,
      views: schema.videos.views,
      likes: schema.videos.likes,
      comments: schema.videos.comments,
      shares: schema.videos.shares,
      createdAt: schema.videos.createdAt,
      user: {
        id: schema.users.id,
        name: schema.users.name,
        avatarUrl: schema.users.avatarUrl,
      },
    })
    .from(schema.videos)
    .leftJoin(schema.users, eq(schema.videos.userId, schema.users.id))
    .orderBy(desc(schema.videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserVideos(userId: number) {
  return await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.userId, userId))
    .orderBy(desc(schema.videos.createdAt));
}

export async function getVideoById(id: number) {
  const result = await db
    .select()
    .from(schema.videos)
    .where(eq(schema.videos.id, id));
  return result[0];
}

// Interaction Helpers
export async function isFollowing(followerId: number, followingId: number) {
  const result = await db
    .select()
    .from(schema.followers)
    .where(
      and(
        eq(schema.followers.followerId, followerId),
        eq(schema.followers.followingId, followingId)
      )
    );
  return result.length > 0;
}

export async function getFollowerCount(userId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.followers)
    .where(eq(schema.followers.followingId, userId));
  return Number(result[0].count);
}

export async function getFollowingCount(userId: number) {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(schema.followers)
    .where(eq(schema.followers.followerId, userId));
  return Number(result[0].count);
}

// Earnings Helpers
export async function createEarning(userId: number, amount: number, type: string, videoId?: number) {
  return await db.insert(schema.earnings).values({
    userId,
    amount: amount.toString(),
    type,
    videoId,
  });
}

export async function getUserEarnings(userId: number) {
  const result = await db
    .select({ total: sql<string>`sum(amount)` })
    .from(schema.earnings)
    .where(eq(schema.earnings.userId, userId));
  return result[0].total || "0";
}

export async function getUserWithdrawals(userId: number) {
  return await db
    .select()
    .from(schema.withdrawals)
    .where(eq(schema.withdrawals.userId, userId))
    .orderBy(desc(schema.withdrawals.createdAt));
}
