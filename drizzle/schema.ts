import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";
import { relations } from "drizzle-orm";

/**
 * =========================
 * USERS
 * =========================
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),

  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),

  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),

  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  country: varchar("country", { length: 64 }),
  currency: varchar("currency", { length: 3 }).default("USD"),

  totalEarnings: decimal("totalEarnings", { precision: 12, scale: 2 }).default("0"),
  totalWithdrawals: decimal("totalWithdrawals", { precision: 12, scale: 2 }).default("0"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "string" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * =========================
 * OTPs (FIX CRITIQUE ICI)
 * =========================
 */
export const otps = mysqlTable("otps", {
  id: int("id").autoincrement().primaryKey(),

  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),

  // 🔴 FIX MYSQL : PAS DE MILLISECONDS
  expiresAt: timestamp("expiresAt", { mode: "string" }).notNull(),

  attempts: int("attempts").default(0).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type OTP = typeof otps.$inferSelect;
export type InsertOTP = typeof otps.$inferInsert;

/**
 * =========================
 * VIDEOS
 * =========================
 */
export const videos = mysqlTable("videos", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  title: text("title"),
  description: text("description"),

  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),

  duration: int("duration"),
  views: int("views").default(0),
  likes: int("likes").default(0),
  comments: int("comments").default(0),
  shares: int("shares").default(0),

  isPublic: boolean("isPublic").default(true),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * =========================
 * LIKES
 * =========================
 */
export const likes = mysqlTable("likes", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * COMMENTS
 * =========================
 */
export const comments = mysqlTable("comments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  videoId: int("videoId").notNull(),
  text: text("text").notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
});

/**
 * =========================
 * FOLLOWERS
 * =========================
 */
export const followers = mysqlTable("followers", {
  id: int("id").autoincrement().primaryKey(),
  followerId: int("followerId").notNull(),
  followingId: int("followingId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * EARNINGS
 * =========================
 */
export const earnings = mysqlTable("earnings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  videoId: int("videoId"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * WITHDRAWALS
 * =========================
 */
export const withdrawals = mysqlTable("withdrawals", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),

  amount: varchar("amount", { length: 50 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().onUpdateNow().notNull(),
});

/**
 * =========================
 * NOTIFICATIONS
 * =========================
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromUserId: int("fromUserId").notNull(),

  type: varchar("type", { length: 50 }).notNull(),
  videoId: int("videoId"),
  message: text("message"),

  isRead: boolean("isRead").default(false).notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * BLOCKS
 * =========================
 */
export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * REPORTS
 * =========================
 */
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),

  videoId: int("videoId"),
  userId: int("userId"),

  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});
