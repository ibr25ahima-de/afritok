import { eq, and, gt, lt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
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
let _initialized = false;

/**
 * Create required tables automatically at server startup
 * This replaces drizzle-kit push (works on Render + phone)
 */
async function initDatabase() {
  if (_initialized || !process.env.DATABASE_URL) return;

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // 🔥 OTP TABLE (CRITICAL)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(32) NOT NULL,
      code VARCHAR(10) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expires_at DATETIME NOT NULL,
      created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone),
      INDEX idx_expires (expires_at)
    );
  `);

  await connection.end();

  _initialized = true;
  console.log("[Database] Tables initialized successfully");
}

// Lazily create the drizzle instance
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      await initDatabase(); // 👈 AUTO TABLE CREATION
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

/* =========================================================
   USERS
========================================================= */

export async function upsertUser(user: Partial<InsertUser>): Promise<void> {
  if (!user.id && !user.phone) {
    throw new Error("User id or phone is required for upsert");
  }

  const db = await getDb();
  if (!db) return;

  const values: Partial<InsertUser> = {};
  const updateSet: Record<string, unknown> = {};

  const textFields = [
    "name",
    "email",
    "loginMethod",
    "phone",
    "bio",
    "avatarUrl",
    "country",
    "currency",
  ] as const;

  for (const field of textFields) {
    if (user[field] !== undefined) {
      const v = user[field] ?? null;
      values[field] = v;
      updateSet[field] = v;
    }
  }

  if (!values.lastSignedIn) values.lastSignedIn = new Date();

  await db.insert(users).values(values as InsertUser).onDuplicateKeyUpdate({
    set: updateSet,
  });
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return undefined;
  const res = await db.select().from(users).where(eq(users.phone, phone)).limit(1);
  return res[0];
}

/* =========================================================
   OTP
========================================================= */

function formatDateForMySQL(date: Date): string {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function createOTP(
  phone: string,
  code: string,
  expiresInMinutes = 10
): Promise<void> {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60_000);

  await db.insert(otps).values({
    phone,
    code,
    attempts: 0,
    expiresAt: formatDateForMySQL(expiresAt) as any,
  });

  console.log(`[OTP] Generated for ${phone}: ${code}`);
}

export async function getValidOTP(
  phone: string
): Promise<InsertOTP | undefined> {
  const db = await getDb();
  if (!db) return;

  const now = formatDateForMySQL(new Date());

  const res = await db
    .select()
    .from(otps)
    .where(and(eq(otps.phone, phone), gt(otps.expiresAt, now as any)))
    .orderBy((o) => o.createdAt)
    .limit(1);

  return res[0];
}

export async function deleteOTP(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(otps).where(eq(otps.id, id));
}

export async function incrementOTPAttempts(id: number) {
  const db = await getDb();
  if (!db) return;

  const otp = await db.select().from(otps).where(eq(otps.id, id)).limit(1);
  if (!otp[0]) return;

  await db
    .update(otps)
    .set({ attempts: otp[0].attempts + 1 })
    .where(eq(otps.id, id));
}
