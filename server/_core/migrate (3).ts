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

    // Add administration columns to users table
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "isBanned" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "banReason" TEXT,
      ADD COLUMN IF NOT EXISTS "bannedAt" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "isSuspended" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "suspendedUntil" TIMESTAMP,
      ADD COLUMN IF NOT EXISTS "suspensionReason" TEXT,
      ADD COLUMN IF NOT EXISTS "warningCount" INTEGER NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "warningMessage" TEXT;
    `);

    // Update users table with new settings columns
    await pool.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS "profilePublic" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "allowMessages" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "allowComments" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "showFollowers" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "showFollowing" BOOLEAN NOT NULL DEFAULT true,

      ADD COLUMN IF NOT EXISTS "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "loginAlerts" BOOLEAN NOT NULL DEFAULT true,

      ADD COLUMN IF NOT EXISTS "notifyFollowers" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "notifyLikes" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "notifyComments" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "notifyShares" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "notifyMessages" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "notifyPromotions" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "language" VARCHAR(20) NOT NULL DEFAULT 'Français',
      ADD COLUMN IF NOT EXISTS "darkMode" VARCHAR(20) NOT NULL DEFAULT 'Système',
      ADD COLUMN IF NOT EXISTS "dataSaver" BOOLEAN NOT NULL DEFAULT false,
      ADD COLUMN IF NOT EXISTS "autoPlay" VARCHAR(30) NOT NULL DEFAULT 'Wi-Fi uniquement',
      ADD COLUMN IF NOT EXISTS "textSize" VARCHAR(20) NOT NULL DEFAULT 'Normale',
      ADD COLUMN IF NOT EXISTS "animations" BOOLEAN NOT NULL DEFAULT true;
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

    // Add favorites and musicId columns if they don't exist (for existing databases)
    try {
      await pool.query(`
        ALTER TABLE videos
        ADD COLUMN IF NOT EXISTS favorites INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS "musicId" INTEGER;
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

    // Create warnings table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS warnings (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        "adminId" INTEGER NOT NULL,
        reason VARCHAR(255) NOT NULL,
        message TEXT,
        "createdAt" TIMESTAMP NOT NULL DEFAULT NOW()
      );
    `);

    await pool.query(`
    CREATE TABLE IF NOT EXISTS music (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      artist TEXT NOT NULL,
      "audioUrl" TEXT NOT NULL,
      "coverUrl" TEXT,
      duration INTEGER NOT NULL,
      category VARCHAR(50) DEFAULT 'trending',
      plays INTEGER DEFAULT 0,
      "isActive" BOOLEAN DEFAULT true,
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