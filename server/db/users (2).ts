import { eq } from "drizzle-orm";
import { db } from "./index";
import {
  users,
  InsertUser,
  likes,
  comments,
  favorites,
  shares,
  followers,
  earnings,
  withdrawals,
  videos,
  notifications,
  blocks,
  reports,
  warnings,
  microEarnings,
} from "../../drizzle/schema";

/* =====================
USERS
===================== */

export async function upsertUser(user: Partial<InsertUser>) {
  if (!user.phone) throw new Error("Phone required");

  await db
    .insert(users)
    .values({
      phone: user.phone,
      name: user.name ?? null,
      email: user.email ?? null,
      loginMethod: user.loginMethod ?? "phone_otp",
      role: user.role ?? "user",
      totalEarnings: 0,
      totalWithdrawals: 0,
      lastSignedIn: new Date(),
    })
    .onConflictDoUpdate({
      target: users.phone,
      set: {
        name: user.name ?? undefined,
        email: user.email ?? undefined,
        lastSignedIn: new Date(),
        updatedAt: new Date(),
      },
    });
}

export async function getUserById(userId: number) {
  return (await db.select().from(users).where(eq(users.id, userId)).limit(1))[0];
}

export async function getUserByPhone(phone: string) {
  return (await db.select().from(users).where(eq(users.phone, phone)).limit(1))[0];
}

export async function deleteUserAccount(userId: number) {
  // Supprimer les interactions
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(comments).where(eq(comments.userId, userId));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  await db.delete(shares).where(eq(shares.userId, userId));
  await db.delete(followers).where(eq(followers.followerId, userId));
  await db.delete(followers).where(eq(followers.followingId, userId));
  await db.delete(earnings).where(eq(earnings.userId, userId));
  await db.delete(withdrawals).where(eq(withdrawals.userId, userId));

  // Supprimer les données liées aux nouvelles tables
  await db.delete(notifications).where(eq(notifications.userId, userId));
  await db.delete(notifications).where(eq(notifications.fromUserId, userId));
  await db.delete(blocks).where(eq(blocks.userId, userId));
  await db.delete(blocks).where(eq(blocks.blockedUserId, userId));
  await db.delete(reports).where(eq(reports.reporterId, userId));
  await db.delete(reports).where(eq(reports.userId, userId));
  await db.delete(warnings).where(eq(warnings.userId, userId));
  await db.delete(warnings).where(eq(warnings.adminId, userId));
  await db.delete(microEarnings).where(eq(microEarnings.userId, userId));

  // Supprimer les vidéos
  await db.delete(videos).where(eq(videos.userId, userId));

  // Supprimer le compte
  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}
