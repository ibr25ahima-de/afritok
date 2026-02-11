import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const db = drizzle(pool);

export async function runMigrations() {
  try {
    console.log("[Migrations] Creating database tables...");

    // Create ENUM type for role
    await db.execute(sql`
      DO $$ BEGIN
        CREATE TYPE role AS ENUM ('user', 'admin');
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;
    `);

    // Create users table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        name TEXT,
        email VARCHAR(320),
        "loginMethod" VARCHAR(64),
        role role NOT NULL DEFAULT 'user',
        bio TEXT,
        "avatarUrl" TEXT,
        country VARCHAR(64),
        currency VARCHAR(3) DEFAULT 'USD',
        "totalEarnings" NUMERIC(12, 2) DEFAULT '0',
        "totalWithdrawals" NUMERIC(12, 2) DEFAULT '0',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "lastSignedIn" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create otps table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS otps (
        id SERIAL PRIMARY KEY,
        phone VARCHAR(20) NOT NULL,
        code VARCHAR(6) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        attempts INTEGER DEFAULT 0 NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create videos table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS videos (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        title TEXT,
        description TEXT,
        "videoUrl" TEXT NOT NULL,
        "thumbnailUrl" TEXT,
        duration INTEGER,
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        comments INTEGER DEFAULT 0,
        shares INTEGER DEFAULT 0,
        "isPublic" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create likes table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "videoId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create comments table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "videoId" INTEGER NOT NULL,
        text TEXT NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create followers table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY,
        "followerId" INTEGER NOT NULL,
        "followingId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create earnings table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS earnings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        source VARCHAR(50) NOT NULL,
        "videoId" INTEGER,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create withdrawals table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS withdrawals (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        amount VARCHAR(50) NOT NULL,
        "paymentMethod" VARCHAR(50) NOT NULL,
        status VARCHAR(50) DEFAULT 'pending',
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create notifications table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "fromUserId" INTEGER NOT NULL,
        type VARCHAR(50) NOT NULL,
        "videoId" INTEGER,
        message TEXT,
        "isRead" BOOLEAN DEFAULT false NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create blocks table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS blocks (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "blockedUserId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create reports table
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        "reporterId" INTEGER NOT NULL,
        "videoId" INTEGER,
        "userId" INTEGER,
        reason VARCHAR(255) NOT NULL,
        description TEXT,
        status VARCHAR(50) DEFAULT 'pending' NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    console.log("✅ Database tables created successfully");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    // Don't throw - allow server to start even if migration fails
  } finally {
    await pool.end();
  }
}
