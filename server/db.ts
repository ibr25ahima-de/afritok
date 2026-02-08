import { eq, and, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";

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

let _db: ReturnType<typeof drizzle> | null = null;
let _initialized = false;

/* =====================
   INIT DATABASE (NO CLI)
===================== */

async function initDatabase() {
  if (_initialized || !process.env.DATABASE_URL) return;

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // 🔥 NOMS ALIGNÉS AVEC DRIZZLE
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(6) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone),
      INDEX idx_expiresAt (expiresAt)
    );
  `);

  await connection.end();
  _initialized = true;
  console.log("[Database] OTP table ready");
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    await initDatabase();
    _db = drizzle(process.env.DATABASE_URL);
  }
  return _db;
}

/* =====================
   USERS
===================== */

export async function upsertUser(user: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;

  const values: Partial<InsertUser> = { ...user };
  if (!values.lastSignedIn) values.lastSignedIn = new Date();

  await db.insert(users).values(values as InsertUser).onDuplicateKeyUpdate({
    set: values,
  });
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return;
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

/* =====================
   OTP
===================== */

function mysqlDate(date: Date) {
  return date.toISOString().slice(0, 19).replace("T", " ");
}

export async function createOTP(
  phone: string,
  code: string,
  expiresInMinutes = 10
) {
  const db = await getDb();
  if (!db) return;

  const expiresAt = new Date(Date.now() + expiresInMinutes * 60000);

  await db.insert(otps).values({
    phone,
    code,
    attempts: 0,
    expiresAt: mysqlDate(expiresAt) as any,
  });

  console.log(`[OTP] ${phone} → ${code}`);
}

export async function getValidOTP(phone: string): Promise<InsertOTP | undefined> {
  const db = await getDb();
  if (!db) return;

  const now = mysqlDate(new Date());

  return (
    await db
      .select()
      .from(otps)
      .where(and(eq(otps.phone, phone), gt(otps.expiresAt, now as any)))
      .limit(1)
  )[0];
}

export async function deleteOTP(otpId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(otps).where(eq(otps.id, otpId));
}

export async function incrementOTPAttempts(otpId: number) {
  const db = await getDb();
  if (!db) return;

  const otp = (
    await db.select().from(otps).where(eq(otps.id, otpId)).limit(1)
  )[0];

  if (!otp) return;

  await db
    .update(otps)
    .set({ attempts: otp.attempts + 1 })
    .where(eq(otps.id, otpId));
        }
