import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { notifications } from "../../drizzle/schema";

/* =====================
NOTIFICATIONS
===================== */

export async function getNotifications(userId: number) {
  return db
    .select()
    .from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt));
}

export async function getUnreadNotificationsCount(userId: number) {
  const result = await db
    .select()
    .from(notifications)
    .where(
      eq(notifications.userId, userId)
    );
  return result.filter((n) => !n.isRead).length;
}

export async function markNotificationAsRead(notificationId: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.id, notificationId));
}

export async function markAllNotificationsAsRead(userId: number) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(eq(notifications.userId, userId));
}

export async function createNotification(
  userId: number,
  fromUserId: number,
  type: string,
  videoId?: number,
  message?: string
) {
  await db.insert(notifications).values({
    userId,
    fromUserId,
    type,
    videoId: videoId || null,
    message,
  });
}

export async function deleteNotification(notificationId: number) {
  await db.delete(notifications).where(eq(notifications.id, notificationId));
}
