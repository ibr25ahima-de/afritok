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
   INIT DATABASE
===================== */

async function initDatabase() {
  if (_initialized || !process.env.DATABASE_URL) return;

  const connection = await mysql.createConnection(process.env.DATABASE_URL);

  // USERS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // VIDEOS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS videos (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // LIKES
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS likes (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // COMMENTS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS comments (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // FOLLOWERS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS followers (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // EARNINGS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS earnings (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // WITHDRAWALS
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS withdrawals (
      id INT AUTO_INCREMENT PRIMARY KEY
    );
  `);

  // OTPS (complète)
  await connection.execute(`
    CREATE TABLE IF NOT EXISTS otps (
      id INT AUTO_INCREMENT PRIMARY KEY,
      phone VARCHAR(20) NOT NULL,
      code VARCHAR(6) NOT NULL,
      attempts INT NOT NULL DEFAULT 0,
      expiresAt DATETIME NOT NULL,
      createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_phone (phone),
      INDEX idx_expires (expiresAt)
    );
  `);

  await connection.end();
  _initialized = true;
  console.log("[Database] all tables ready");
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

export async function getUserById(userId: number) {
  const db = await getDb();
  if (!db) return;
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function getUserByPhone(phone: string) {
  const db = await getDb();
  if (!db) return;
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

/* =====================
   VIDEOS
===================== */

export async function getVideoById(videoId: number) {
  const db = await getDb();
  if (!db) return;
  return (await db.select().from(videos).where(eq(videos.id, videoId)).limit(1))[0];
}

export async function getFeedVideos(limit = 20, offset = 0) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).limit(limit).offset(offset);
}

export async function getUserVideos(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(videos).where(eq(videos.userId, userId));
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
