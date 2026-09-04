import { eq, desc } from "drizzle-orm";
import { db } from "./index";
import { notifications, users } from "../../drizzle/schema";

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
    .where(eq(notifications.userId, userId));
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

/**
 * Creates an in-app notification only when the recipient has enabled the
 * corresponding existing notification preference.
 *
 * The current schema has preferences for followers, likes, comments, shares,
 * messages and promotions. Other notification types are left unchanged
 * because there is no matching user preference in the existing schema.
 */
export async function createNotification(
  userId: number,
  fromUserId: number,
  type: string,
  videoId?: number,
  message?: string
) {
  const [recipient] = await db
    .select({
      notifyFollowers: users.notifyFollowers,
      notifyLikes: users.notifyLikes,
      notifyComments: users.notifyComments,
      notifyShares: users.notifyShares,
      notifyMessages: users.notifyMessages,
      notifyPromotions: users.notifyPromotions,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!recipient) return null;

  const enabled =
    type === "follow" ? recipient.notifyFollowers :
    type === "like" ? recipient.notifyLikes :
    type === "comment" ? recipient.notifyComments :
    type === "share" ? recipient.notifyShares :
    type === "message" ? recipient.notifyMessages :
    type === "promotion" ? recipient.notifyPromotions :
    true;

  if (!enabled) return null;

  const [created] = await db
    .insert(notifications)
    .values({
      userId,
      fromUserId,
      type,
      videoId: videoId || null,
      message,
    })
    .returning({ id: notifications.id });

  return created?.id ?? null;
}

export async function deleteNotification(notificationId: number) {
  await db.delete(notifications).where(eq(notifications.id, notificationId));
}
