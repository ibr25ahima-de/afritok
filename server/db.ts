import { eq, and, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  videos,
  likes,
  comments,
  followers,
  earnings,
  withdrawals,
  otps,
  InsertOTP,
} from "../drizzle/schema";

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

// ============================================
// USER
// ============================================

export async function upsertUser(user: Partial<InsertUser>): Promise<void> {
  if (!user.id && !user.phone) {
    throw new Error("User id or phone is required for upsert");
  }

  const db = await getDb();
  if (!db) return;

  const values: Partial<InsertUser> = {};
  const updateSet: Record<string, unknown> = {};

  const fields = [
    "name",
    "email",
    "loginMethod",
    "phone",
    "bio",
    "avatarUrl",
    "country",
    "currency",
  ] as const;

  for (const field of fields) {
    if (user[field] !== undefined) {
      values[field] = user[field] ?? null;
      updateSet[field] = user[field] ?? null;
    }
  }

  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  }

  values.lastSignedIn = new Date();
  updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values as InsertUser).onDuplicateKeyUpdate({
    set: updateSet,
  });
}

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return;
  const res = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  return res[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return;
  const res = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return res[0];
}

// ============================================
// VIDEOS
// ============================================

export async function getUserVideos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.userId, userId));
}

export async function getFeedVideos(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(videos)
    .where(eq(videos.isPublic, true))
    .limit(limit)
    .offset(offset);
}

// ============================================
// OTP — VERSION STABLE & PRODUCTION
// ============================================

export async function createOTP(
  phone: string,
  code: string,
  expiresInMinutes: number = 10
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.insert(otps).values({
    phone,
    code,
    attempts: 0,
    expiresAt: sql`DATE_ADD(NOW(), INTERVAL ${expiresInMinutes} MINUTE)`,
  });

  console.log(`[OTP] Created for ${phone}`);
}

export async function getValidOTP(
  phone: string
): Promise<InsertOTP | undefined> {
  const db = await getDb();
  if (!db) return;

  const res = await db
    .select()
    .from(otps)
    .where(
      and(
        eq(otps.phone, phone),
        sql`${otps.expiresAt} > NOW()`
      )
    )
    .orderBy(otps.createdAt)
    .limit(1);

  return res[0];
}

export async function deleteOTP(otpId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.delete(otps).where(eq(otps.id, otpId));
}

export async function incrementOTPAttempts(otpId: number): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db
    .update(otps)
    .set({ attempts: sql`${otps.attempts} + 1` })
    .where(eq(otps.id, otpId));
}

export async function cleanupExpiredOTPs(): Promise<void> {
  const db = await getDb();
  if (!db) return;

  await db.delete(otps).where(
    sql`${otps.expiresAt} < NOW()`
  );

  console.log("[OTP] Expired OTPs cleaned");
      }
