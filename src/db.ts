import { eq, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, videos, likes, comments, followers, earnings, withdrawals } from "../drizzle/schema";
import { ENV } from './_core/env';

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

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
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
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

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
