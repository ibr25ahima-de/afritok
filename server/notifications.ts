import { mysqlTable, int, varchar, text, timestamp, boolean } from "drizzle-orm/mysql-core";
import { drizzle } from "drizzle-orm/mysql2";

// Notifications table
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fromUserId: int("fromUserId").notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'like', 'comment', 'follow', 'share'
  videoId: int("videoId"),
  message: text("message"),
  isRead: boolean("isRead").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Blocks table
export const blocks = mysqlTable("blocks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  blockedUserId: int("blockedUserId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

// Reports table
export const reports = mysqlTable("reports", {
  id: int("id").autoincrement().primaryKey(),
  reporterId: int("reporterId").notNull(),
  videoId: int("videoId"),
  userId: int("userId"),
  reason: varchar("reason", { length: 255 }).notNull(),
  description: text("description"),
  status: varchar("status", { length: 50 }).default("pending").notNull(), // 'pending', 'reviewed', 'resolved'
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type Report = typeof reports.$inferSelect;
