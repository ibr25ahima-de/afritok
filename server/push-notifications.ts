/**
 * Système de notifications push pour Afritok
 * Gère l'envoi et le filtrage des notifications selon les préférences du compte.
 */

import { db } from './db';
import { users } from '../drizzle/schema';
import { eq } from 'drizzle-orm';
import { getLogger } from './logging';

const logger = getLogger();

export interface DeviceRegistration {
  userId: number;
  deviceToken: string;
  deviceType: 'ios' | 'android' | 'web';
  deviceName?: string;
  isActive: boolean;
}

export interface NotificationPayload {
  userId: number;
  title: string;
  body: string;
  type: 'like' | 'comment' | 'follow' | 'message' | 'mention' | 'duet' | 'stitch' | 'gift' | 'system';
  relatedId?: number;
  relatedUserId?: number;
  data?: Record<string, any>;
  image?: string;
  deepLink?: string;
}

export interface NotificationPreferences {
  userId: number;
  likesEnabled: boolean;
  commentsEnabled: boolean;
  followsEnabled: boolean;
  messagesEnabled: boolean;
  mentionsEnabled: boolean;
  duetsEnabled: boolean;
  stitchesEnabled: boolean;
  giftsEnabled: boolean;
  systemEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
}

export class PushNotificationsManager {
  async registerDevice(registration: DeviceRegistration): Promise<boolean> {
    logger.info('Device registered', { userId: registration.userId, deviceType: registration.deviceType });
    return true;
  }

  async unregisterDevice(userId: number, deviceToken: string): Promise<boolean> {
    logger.info('Device unregistered', { userId, deviceTokenPresent: Boolean(deviceToken) });
    return true;
  }

  async getUserDevices(userId: number): Promise<DeviceRegistration[]> {
    logger.info('Getting user devices', { userId });
    return [];
  }

  async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      const prefs = await this.getUserNotificationPreferences(payload.userId);
      if (!prefs || !this.isNotificationTypeEnabled(payload.type, prefs)) {
        logger.info('Notification blocked by user preference', { userId: payload.userId, type: payload.type });
        return false;
      }
      if (this.isInQuietHours(prefs)) {
        logger.info('Notification blocked by quiet hours', { userId: payload.userId });
        return false;
      }

      // The project does not yet have a configured FCM/APNs provider. Do not
      // pretend a push was delivered; return false until a real provider exists.
      logger.info('Push notification eligible but no push provider configured', {
        userId: payload.userId,
        type: payload.type,
      });
      return false;
    } catch (error) {
      logger.error('Failed to send push notification', { error, payload });
      return false;
    }
  }

  async sendInAppNotification(payload: NotificationPayload): Promise<number | null> {
    try {
      const prefs = await this.getUserNotificationPreferences(payload.userId);
      if (!prefs || !this.isNotificationTypeEnabled(payload.type, prefs)) return null;
      logger.info('In-app notification eligible', { userId: payload.userId, type: payload.type });
      return null;
    } catch (error) {
      logger.error('Failed to send in-app notification', { error });
      return null;
    }
  }

  async getUserNotifications(userId: number, limit: number = 20, offset: number = 0): Promise<any[]> {
    logger.info('Getting user notifications', { userId, limit, offset });
    return [];
  }

  async markNotificationAsRead(notificationId: number, userId: number): Promise<boolean> {
    logger.info('Mark notification as read requested', { notificationId, userId });
    return true;
  }

  async markAllNotificationsAsRead(userId: number): Promise<boolean> {
    logger.info('Mark all notifications as read requested', { userId });
    return true;
  }

  async getUnreadNotificationCount(userId: number): Promise<number> {
    logger.info('Getting unread notification count', { userId });
    return 0;
  }

  async deleteNotification(notificationId: number, userId: number): Promise<boolean> {
    logger.info('Delete notification requested', { notificationId, userId });
    return true;
  }

  async getUserNotificationPreferences(userId: number): Promise<NotificationPreferences | null> {
    try {
      const [user] = await db
        .select({
          notifyFollowers: users.notifyFollowers,
          notifyLikes: users.notifyLikes,
          notifyComments: users.notifyComments,
          notifyMessages: users.notifyMessages,
        })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) return null;

      return {
        userId,
        likesEnabled: user.notifyLikes,
        commentsEnabled: user.notifyComments,
        followsEnabled: user.notifyFollowers,
        messagesEnabled: user.notifyMessages,
        // These notification types exist in the notification engine, but there
        // are no corresponding user settings in the current AfriTok schema.
        // Keep them enabled rather than inventing new account parameters.
        mentionsEnabled: true,
        duetsEnabled: true,
        stitchesEnabled: true,
        giftsEnabled: true,
        systemEnabled: true,
      };
    } catch (error) {
      logger.error('Failed to get user notification preferences', { error });
      return null;
    }
  }

  async updateNotificationPreferences(userId: number, preferences: Partial<NotificationPreferences>): Promise<boolean> {
    const values: Partial<typeof users.$inferInsert> = { updatedAt: new Date() };
    if (preferences.likesEnabled !== undefined) values.notifyLikes = preferences.likesEnabled;
    if (preferences.commentsEnabled !== undefined) values.notifyComments = preferences.commentsEnabled;
    if (preferences.followsEnabled !== undefined) values.notifyFollowers = preferences.followsEnabled;
    if (preferences.messagesEnabled !== undefined) values.notifyMessages = preferences.messagesEnabled;

    await db.update(users).set(values).where(eq(users.id, userId));
    return true;
  }

  private isNotificationTypeEnabled(type: NotificationPayload['type'], prefs: NotificationPreferences): boolean {
    switch (type) {
      case 'like': return prefs.likesEnabled;
      case 'comment': return prefs.commentsEnabled;
      case 'follow': return prefs.followsEnabled;
      case 'message': return prefs.messagesEnabled;
      case 'mention': return prefs.mentionsEnabled;
      case 'duet': return prefs.duetsEnabled;
      case 'stitch': return prefs.stitchesEnabled;
      case 'gift': return prefs.giftsEnabled;
      case 'system': return prefs.systemEnabled;
      default: return false;
    }
  }

  private isInQuietHours(prefs: NotificationPreferences): boolean {
    if (!prefs.quietHoursStart || !prefs.quietHoursEnd) return false;
    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    if (prefs.quietHoursStart < prefs.quietHoursEnd) {
      return currentTime >= prefs.quietHoursStart && currentTime <= prefs.quietHoursEnd;
    }
    return currentTime >= prefs.quietHoursStart || currentTime <= prefs.quietHoursEnd;
  }

  async notifyLike(userId: number, videoId: number, likerUserId: number): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau like', body: "Quelqu'un a aimé votre vidéo", type: 'like', relatedId: videoId, relatedUserId: likerUserId });
  }

  async notifyComment(userId: number, videoId: number, commenterUserId: number, commentText: string): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau commentaire', body: commentText.substring(0, 100), type: 'comment', relatedId: videoId, relatedUserId: commenterUserId });
  }

  async notifyFollow(userId: number, followerUserId: number): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau follower', body: 'Quelqu\'un vous suit', type: 'follow', relatedUserId: followerUserId });
  }

  async notifyMessage(userId: number, senderUserId: number, messageText: string): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau message', body: messageText.substring(0, 100), type: 'message', relatedUserId: senderUserId });
  }

  async notifyMention(userId: number, mentionerUserId: number, videoId: number): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Vous avez été mentionné', body: "Quelqu'un vous a mentionné dans une vidéo", type: 'mention', relatedId: videoId, relatedUserId: mentionerUserId });
  }

  async notifyDuet(userId: number, duetCreatorUserId: number, videoId: number): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau duet', body: 'Quelqu\'un a créé un duet avec votre vidéo', type: 'duet', relatedId: videoId, relatedUserId: duetCreatorUserId });
  }

  async notifyStitch(userId: number, stitchCreatorUserId: number, videoId: number): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Nouveau stitch', body: 'Quelqu\'un a créé un stitch avec votre vidéo', type: 'stitch', relatedId: videoId, relatedUserId: stitchCreatorUserId });
  }

  async notifyGift(userId: number, giftSenderUserId: number, giftName: string): Promise<boolean> {
    return this.sendPushNotification({ userId, title: 'Vous avez reçu un cadeau', body: `${giftName} de quelqu'un`, type: 'gift', relatedUserId: giftSenderUserId });
  }
}

let manager: PushNotificationsManager | null = null;
export function getPushNotificationsManager(): PushNotificationsManager {
  if (!manager) manager = new PushNotificationsManager();
  return manager;
}
