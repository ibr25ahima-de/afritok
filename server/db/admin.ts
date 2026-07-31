import { eq, and } from "drizzle-orm";
import { db } from "./index";
import { users, warnings } from "../../drizzle/schema";

/* =====================
ADMINISTRATION
===================== */

export async function getAllUsers(limit: number = 50, offset: number = 0) {
  return db.select().from(users).limit(limit).offset(offset);
}

export async function banUser(userId: number, reason: string, adminId: number) {
  await db
    .update(users)
    .set({
      isBanned: true,
      banReason: reason,
      bannedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function unbanUser(userId: number) {
  await db
    .update(users)
    .set({
      isBanned: false,
      banReason: null,
      bannedAt: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function suspendUser(userId: number, reason: string, until: Date) {
  await db
    .update(users)
    .set({
      isSuspended: true,
      suspensionReason: reason,
      suspendedUntil: until,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function unsuspendUser(userId: number) {
  await db
    .update(users)
    .set({
      isSuspended: false,
      suspensionReason: null,
      suspendedUntil: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));
}

export async function addWarning(userId: number, adminId: number, reason: string, message?: string) {
  // Insérer dans la table warnings
  await db.insert(warnings).values({
    userId,
    adminId,
    reason,
    message,
  });

  // Mettre à jour le compteur de warnings
  const user = (
    await db.select().from(users).where(eq(users.id, userId)).limit(1)
  )[0];

  if (user) {
    await db
      .update(users)
      .set({
        warningCount: (user.warningCount || 0) + 1,
        warningMessage: message,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));
  }
}

export async function getWarnings(userId: number) {
  return db.select().from(warnings).where(eq(warnings.userId, userId));
}

export async function resetWarnings(userId: number) {
  await db
    .update(users)
    .set({
      warningCount: 0,
      warningMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  await db.delete(warnings).where(eq(warnings.userId, userId));
}

export async function promoteUser(userId: number) {
  await db
    .update(users)
    .set({ role: "admin", updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function demoteUser(userId: number) {
  await db
    .update(users)
    .set({ role: "user", updatedAt: new Date() })
    .where(eq(users.id, userId));
}

export async function getBannedUsers() {
  return db.select().from(users).where(eq(users.isBanned, true));
}

export async function getSuspendedUsers() {
  return db.select().from(users).where(eq(users.isSuspended, true));
}
