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

  totalEarnings: numeric("totalEarnings", { precision: 10, scale: 4 }).default("0"),
totalWithdrawals: numeric("totalWithdrawals", { precision: 10, scale: 4 }).default("0"),
// =====================
  // PRIVACY
  // =====================
  profilePublic: boolean("profilePublic").default(true).notNull(),
  allowMessages: boolean("allowMessages").default(true).notNull(),
  allowComments: boolean("allowComments").default(true).notNull(),
  showFollowers: boolean("showFollowers").default(true).notNull(),
  showFollowing: boolean("showFollowing").default(true).notNull(),

  // =====================
  // SECURITY
  // =====================
  twoFactorEnabled: boolean("twoFactorEnabled").default(false).notNull(),
  loginAlerts: boolean("loginAlerts").default(true).notNull(),

  // =====================
  // NOTIFICATIONS
  // =====================
  notifyFollowers: boolean("notifyFollowers").default(true).notNull(),
  notifyLikes: boolean("notifyLikes").default(true).notNull(),
  notifyComments: boolean("notifyComments").default(true).notNull(),
  notifyShares: boolean("notifyShares").default(true).notNull(),
  notifyMessages: boolean("notifyMessages").default(true).notNull(),
  notifyPromotions: boolean("notifyPromotions").default(false).notNull(),

  // =====================
  // DISPLAY
  // =====================
  language: varchar("language", { length: 20 }).default("Français").notNull(),
  darkMode: varchar("darkMode", { length: 20 }).default("Système").notNull(),
  dataSaver: boolean("dataSaver").default(false).notNull(),
  autoPlay: varchar("autoPlay", { length: 30 }).default("Wi-Fi uniquement").notNull(),
  textSize: varchar("textSize", { length: 20 }).default("Normale").notNull(),
  animations: boolean("animations").default(true).notNull(),

  // =====================
  // ADMINISTRATION
  // =====================
  isBanned: boolean("isBanned").default(false).notNull(),
  banReason: text("banReason"),
  bannedAt: timestamp("bannedAt", { mode: "string" }),

  isSuspended: boolean("isSuspended").default(false).notNull(),
  suspendedUntil: timestamp("suspendedUntil", { mode: "string" }),
  suspensionReason: text("suspensionReason"),

  warningCount: integer("warningCount").default(0).notNull(),
  warningMessage: text("warningMessage"),

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

  title: text("title").notNull(),
  description: text("description"),

  videoUrl: text("videoUrl").notNull(),
  thumbnailUrl: text("thumbnailUrl"),

  duration: integer("duration"),
  views: integer("views").default(0),
  likes: integer("likes").default(0),
  comments: integer("comments").default(0),
  shares: integer("shares").default(0),
  favorites: integer("favorites").default(0),

  musicId: integer("musicId"),

  isPublic: boolean("isPublic").default(true),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
});

export type Video = typeof videos.$inferSelect;
export type InsertVideo = typeof videos.$inferInsert;

/**
 * =========================
 * MUSIC LIBRARY
 * =========================
 */
export const music = pgTable("music", {
  id: serial("id").primaryKey(),

  title: text("title").notNull(),

  artist: text("artist").notNull(),

  audioUrl: text("audioUrl").notNull(),

  coverUrl: text("coverUrl"),

  duration: integer("duration").notNull(),

  category: varchar("category", { length: 50 }).default("trending"),

  plays: integer("plays").default(0),

  isActive: boolean("isActive").default(true),

  createdAt: timestamp("createdAt", { mode: "string" })
    .defaultNow()
    .notNull(),
});

export type Music = typeof music.$inferSelect;
export type InsertMusic = typeof music.$inferInsert;

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

export type Like = typeof likes.$inferSelect;
export type InsertLike = typeof likes.$inferInsert;

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

export type Comment = typeof comments.$inferSelect;
export type InsertComment = typeof comments.$inferInsert;

/**
 * =========================
 * FAVORITES
 * =========================
 */
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  videoId: integer("videoId").notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

/**
 * =========================
 * SHARES
 * =========================
 */
export const shares = pgTable("shares", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  videoId: integer("videoId").notNull(),
  platform: varchar("platform", { length: 50 }).notNull(),
  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type Share = typeof shares.$inferSelect;
export type InsertShare = typeof shares.$inferInsert;

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

export type Follower = typeof followers.$inferSelect;
export type InsertFollower = typeof followers.$inferInsert;

/**
 * =========================
 * EARNINGS
 * =========================
 */
export const earnings = pgTable("earnings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),

  amount: numeric("amount", { precision: 10, scale: 4 }).notNull(),
  source: varchar("source", { length: 50 }).notNull(),
  videoId: integer("videoId"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type Earning = typeof earnings.$inferSelect;
export type InsertEarning = typeof earnings.$inferInsert;

/**
 * =========================
 * MICRO EARNINGS (CORE SYSTEM)
 * =========================
 */
export const microEarnings = pgTable("micro_earnings", {
  id: varchar("id", { length: 100 }).primaryKey(),

  userId: integer("userId").notNull(),

  type: varchar("type", { length: 50 }).notNull(), 
  // watch, like, comment, share, invite, etc.

  amount: numeric("amount", { precision: 10, scale: 4 }).notNull(),

  videoId: integer("videoId"),
  referredUserId: integer("referredUserId"),
  taskId: varchar("taskId", { length: 100 }),

  description: text("description"),

  status: varchar("status", { length: 20 }).default("completed"),
  // pending | completed | verified

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

  amount: integer("amount").notNull(),
  paymentMethod: varchar("paymentMethod", { length: 50 }).notNull(),

  phone: varchar("phone", { length: 20 }).notNull(), // ✅ AJOUT IMPORTANT

  status: varchar("status", { length: 50 }).default("pending"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
  updatedAt: timestamp("updatedAt", { mode: "string" }).defaultNow().notNull(),
});
export type Withdrawal = typeof withdrawals.$inferSelect;
export type InsertWithdrawal = typeof withdrawals.$inferInsert;

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

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

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

export type Block = typeof blocks.$inferSelect;
export type InsertBlock = typeof blocks.$inferInsert;

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

export type Report = typeof reports.$inferSelect;
export type InsertReport = typeof reports.$inferInsert;
/**
 * =========================
 * WARNINGS
 * =========================
 */
export const warnings = pgTable("warnings", {
  id: serial("id").primaryKey(),
  userId: integer("userId").notNull(),
  adminId: integer("adminId").notNull(),

  reason: varchar("reason", { length: 255 }).notNull(),
  message: text("message"),

  createdAt: timestamp("createdAt", { mode: "string" }).defaultNow().notNull(),
});

export type Warning = typeof warnings.$inferSelect;
export type InsertWarning = typeof warnings.$inferInsert;

/**
 * =========================
 * RELATIONS
 * =========================
 */
export const usersRelations = relations(users, ({ many }) => ({
  warnings: many(warnings),
  sentWarnings: many(warnings, { relationName: "adminWarnings" }),
}));

export const warningsRelations = relations(warnings, ({ one }) => ({
  user: one(users, {
    fields: [warnings.userId],
    references: [users.id],
  }),
  admin: one(users, {
    fields: [warnings.adminId],
    references: [users.id],
    relationName: "adminWarnings",
  }),
}));