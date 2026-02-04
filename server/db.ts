import { eq, and, gt, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, videos, likes, comments, followers, earnings, withdrawals, otps, InsertOTP } from "../drizzle/schema";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: Partial<InsertUser>): Promise<void> {
  if (!user.id && !user.phone) {
    throw new Error("User id or phone is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: Partial<InsertUser> = {};
    if (user.id) values.id = user.id;
    if (user.phone) values.phone = user.phone;

    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "phone", "bio", "avatarUrl", "country", "currency"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    if (Object.keys(values).length === 0) {
      return;
    }

    await db.insert(users).values(values as InsertUser).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.id, userId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.phone, phone)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// Video queries
export async function getUserVideos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.userId, userId)).orderBy((v) => v.createdAt);
}

export async function getVideoById(videoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getFeedVideos(limit: number = 20, offset: number = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.isPublic, true)).orderBy((v) => v.createdAt).limit(limit).offset(offset);
}

// Like queries
export async function getUserLike(userId: number, videoId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(likes).where(and(eq(likes.userId, userId), eq(likes.videoId, videoId))).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Comment queries
export async function getVideoComments(videoId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(comments).where(eq(comments.videoId, videoId)).orderBy((c) => c.createdAt);
}

// Follower queries
export async function getFollowerCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(followers).where(eq(followers.followingId, userId));
  return result.length;
}

export async function getFollowingCount(userId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select().from(followers).where(eq(followers.followerId, userId));
  return result.length;
}

export async function isFollowing(followerId: number, followingId: number) {
  const db = await getDb();
  if (!db) return false;
  const result = await db.select().from(followers).where(and(eq(followers.followerId, followerId), eq(followers.followingId, followingId))).limit(1);
  return result.length > 0;
}

// Earnings queries
export async function getUserEarnings(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(earnings).where(eq(earnings.userId, userId)).orderBy((e) => e.createdAt);
}

export async function getUserWithdrawals(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(withdrawals).where(eq(withdrawals.userId, userId)).orderBy((w) => w.createdAt);
}

// ============================================
// OTP FUNCTIONS FOR PHONE AUTHENTICATION
// ============================================

/**
 * Create a new OTP for phone authentication
 * @param phone - Phone number
 * @param code - 6-digit OTP code
 * @param expiresInMinutes - Expiration time in minutes (default: 10)
 */
export async function createOTP(phone: string, code: string, expiresInMinutes: number = 10): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot create OTP: database not available");
    return;
  }

  try {
    const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000);
    await db.insert(otps).values({
      phone,
      code,
      expiresAt,
      attempts: 0,
    });
    console.log(`[OTP] Created OTP for ${phone}, expires at ${expiresAt.toISOString()}`);
  } catch (error) {
    console.error("[Database] Failed to create OTP:", error);
    throw error;
  }
}

/**
 * Get the latest valid (non-expired) OTP for a phone number
 * @param phone - Phone number
 * @returns OTP object or undefined if not found or expired
 */
export async function getValidOTP(phone: string): Promise<InsertOTP | undefined> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get OTP: database not available");
    return undefined;
  }

  try {
    const now = new Date();
    const result = await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), gt(otps.expiresAt, now)))
      .orderBy((o) => o.createdAt)
      .limit(1);

    return result.length > 0 ? result[0] : undefined;
  } catch (error) {
    console.error("[Database] Failed to get OTP:", error);
    throw error;
  }
}

/**
 * Delete an OTP by ID (used after successful verification)
 * @param otpId - OTP ID
 */
export async function deleteOTP(otpId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot delete OTP: database not available");
    return;
  }

  try {
    await db.delete(otps).where(eq(otps.id, otpId));
    console.log(`[OTP] Deleted OTP ${otpId}`);
  } catch (error) {
    console.error("[Database] Failed to delete OTP:", error);
    throw error;
  }
}

/**
 * Increment OTP attempt counter (for rate limiting)
 * @param otpId - OTP ID
 */
export async function incrementOTPAttempts(otpId: number): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot increment OTP attempts: database not available");
    return;
  }

  try {
    const otp = await db.select().from(otps).where(eq(otps.id, otpId)).limit(1);
    if (otp.length > 0) {
      const newAttempts = otp[0].attempts + 1;
      await db.update(otps).set({ attempts: newAttempts }).where(eq(otps.id, otpId));
      console.log(`[OTP] Incremented attempts for OTP ${otpId} to ${newAttempts}`);
    }
  } catch (error) {
    console.error("[Database] Failed to increment OTP attempts:", error);
    throw error;
  }
}

/**
 * Clean up expired OTPs from database
 * Should be called periodically to maintain database health
 */
export async function cleanupExpiredOTPs(): Promise<void> {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot cleanup OTPs: database not available");
    return;
  }

  try {
    const now = new Date();
    const result = await db.delete(otps).where(lt(otps.expiresAt, now));
    console.log(`[OTP] Cleaned up expired OTPs`);
  } catch (error) {
    console.error("[Database] Failed to cleanup OTPs:", error);
  }
}
