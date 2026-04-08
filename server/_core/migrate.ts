import { Pool } from "pg";
import { sql } from "drizzle-orm";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is not defined");
}

let migrationInProgress = false;

async function createTables(pool: Pool) {
  if (migrationInProgress) return;
  migrationInProgress = true;

  try {
    console.log("[Migrations] Creating database tables...");

    // Create ENUM type for role
    try {
      await pool.query(`
        DO $$ BEGIN
          CREATE TYPE role AS ENUM ('user', 'admin');
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END $$;
      `);
    } catch (e) {
      // Ignore if enum already exists
    }

    // Create users table
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
        favorites INTEGER DEFAULT 0,
        "isPublic" BOOLEAN DEFAULT true,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Add favorites column if it doesn't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0;
      `);
    } catch (e) {
      // Column might already exist
    }

    // Create likes table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "videoId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create favorites table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "videoId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create shares table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS shares (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "videoId" INTEGER NOT NULL,
        platform VARCHAR(50) NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create comments table
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS followers (
        id SERIAL PRIMARY KEY,
        "followerId" INTEGER NOT NULL,
        "followingId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create earnings table
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
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
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blocks (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "blockedUserId" INTEGER NOT NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    // Create reports table
    await pool.query(`
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
    console.error("❌ Migration error:", error);
  }
}

export async function runMigrations() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });

  try {
    // Run migrations in background - don't wait for them
    createTables(pool).catch(err => console.error("[Migrations] Background error:", err));
    
    // Return immediately so server can start
    console.log("[Migrations] Scheduled background table creation");
  } catch (error) {
    console.error("[Migrations] Failed to schedule:", error);
  }
}
