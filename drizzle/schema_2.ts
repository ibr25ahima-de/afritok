import {
  integer,
  text,
  timestamp,
  varchar,
  numeric,
  boolean,
  pgTable,
  pgEnum,
  serial,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

/**
 * =========================
 * ENUMS
 * =========================
 */
export const roleEnum = pgEnum("role", ["user", "admin"]);

/**
 * =========================
 * USERS
 * =========================
 */
export const users = pgTable("users", {
  id: serial("id").primaryKey(),

  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),

  role: roleEnum("role").default("user").notNull(),

  bio: text("bio"),
  avatarUrl: text("avatarUrl"),
  country: varchar("country", { length: 64 }),
  currency: varchar("currency", { length: 3 }).default("USD"),

  totalEarnings: numeric("totalEarnings", { precision: 12, scale: 2 }).default("0"),
  totalWithdrawals: numeric("totalWithdrawals", { precision: 12, scale: 2 }).default("0"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn", { mode: "string" }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * =========================
 * OTPs
 * =========================
 */
export const otps = pgTable("otps", {
  id: serial("id").primaryKey(),

  phone: varchar("phone", { length: 20 }).notNull(),
  code: varchar("code", { length: 6 }).notNull(),

  expiresAt: timestamp("expiresAt", { mode: "string" }).notNull(),

  attempts: integer("attempts").default(0).notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type OTP = typeof otps.$inferSelect;
export type InsertOTP = typeof otps.$inferInsert;

/**
 * =========================
 * VIDEOS
 * =========================
 */
export const videos = pgTable("videos", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),

  title: text("title"),
  description: text("description"),

  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),

  duration: integer("duration"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),

  isPublic: boolean("isPublic").default(true),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * =========================
 * LIKES
 * =========================
 */
export const likes = pgTable("likes", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  videoId: integer("videoId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * COMMENTS
 * =========================
 */
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  videoId: integer("videoId").notNull(),
  text: text("text").notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * FOLLOWERS
 * =========================
 */
export const followers = pgTable("followers", {
  id: serial("id").primaryKey(),
  followerId: integer("followerId").notNull(),
  followingId: integer("followingId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * EARNINGS
 * =========================
 */
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),

  amount: numeric("amount", { precision: 12, scale: 2 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  videoId: integer("videoId"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * WITHDRAWALS
 * =========================
 */
export const withdrawals = pgTable("withdrawals", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),

  amount: varchar("amount", { length: 50 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * NOTIFICATIONS
 * =========================
 */
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  fromUserId: integer("fromUserId").notNull(),

  type: varchar("type", { length: 50 }).notNull(),
  videoId: integer("videoId"),
  message: text("message"),

  isRead: boolean("isRead").default(false).notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * BLOCKS
 * =========================
 */
export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  blockedUserId: integer("blockedUserId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

/**
 * =========================
 * REPORTS
 * =========================
 */
export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  reporterId: integer("reporterId").notNull(),

  videoId: integer("videoId"),
  userId: integer("userId"),

  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});
