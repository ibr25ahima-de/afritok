/**
 * Routeurs tRPC pour les notifications push
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getPushNotificationsManager } from './push-notifications';

export const pushNotificationsRouter = router({
  /**
   * Enregistrer un appareil
   */
  registerDevice: protectedProcedure
    .input(
      z.object({
        deviceToken: z.string(),
        deviceType: z.enum(['ios', 'android', 'web']),
        deviceName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      const success = await manager.registerDevice({
        userId: ctx.user.id,
        deviceToken: input.deviceToken,
        deviceType: input.deviceType,
        deviceName: input.deviceName,
        isActive: true,
      });

      return { success };
    }),

  /**
   * Désenregistrer un appareil
   */
  unregisterDevice: protectedProcedure
    .input(z.object({ deviceToken: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      const success = await manager.unregisterDevice(ctx.user.id, input.deviceToken);
      return { success };
    }),

  /**
   * Obtenir les appareils de l'utilisateur
   */
  getUserDevices: protectedProcedure.query(async ({ ctx }) => {
    const manager = getPushNotificationsManager();
    return await manager.getUserDevices(ctx.user.id);
  }),

  /**
   * Obtenir les notifications de l'utilisateur
   */
  getUserNotifications: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      return await manager.getUserNotifications(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Marquer une notification comme lue
   */
  markNotificationAsRead: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      const success = await manager.markNotificationAsRead(input.notificationId, ctx.user.id);
      return { success };
    }),

  /**
   * Marquer toutes les notifications comme lues
   */
  markAllNotificationsAsRead: protectedProcedure.mutation(async ({ ctx }) => {
    const manager = getPushNotificationsManager();
    const success = await manager.markAllNotificationsAsRead(ctx.user.id);
    return { success };
  }),

  /**
   * Obtenir le nombre de notifications non lues
   */
  getUnreadNotificationCount: protectedProcedure.query(async ({ ctx }) => {
    const manager = getPushNotificationsManager();
    const count = await manager.getUnreadNotificationCount(ctx.user.id);
    return { count };
  }),

  /**
   * Supprimer une notification
   */
  deleteNotification: protectedProcedure
    .input(z.object({ notificationId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      const success = await manager.deleteNotification(input.notificationId, ctx.user.id);
      return { success };
    }),

  /**
   * Obtenir les préférences de notifications
   */
  getNotificationPreferences: protectedProcedure.query(async ({ ctx }) => {
    const manager = getPushNotificationsManager();
    return await manager.getUserNotificationPreferences(ctx.user.id);
  }),

  /**
   * Mettre à jour les préférences de notifications
   */
  updateNotificationPreferences: protectedProcedure
    .input(
      z.object({
        likesEnabled: z.boolean().optional(),
        commentsEnabled: z.boolean().optional(),
        followsEnabled: z.boolean().optional(),
        messagesEnabled: z.boolean().optional(),
        mentionsEnabled: z.boolean().optional(),
        duetsEnabled: z.boolean().optional(),
        stitchesEnabled: z.boolean().optional(),
        giftsEnabled: z.boolean().optional(),
        systemEnabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(),
        quietHoursEnd: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getPushNotificationsManager();
      const success = await manager.updateNotificationPreferences(ctx.user.id, input);
      return { success };
    }),

  /**
   * Tester l'envoi d'une notification push
   */
  testPushNotification: protectedProcedure.mutation(async ({ ctx }) => {
    const manager = getPushNotificationsManager();
    const success = await manager.sendPushNotification({
      userId: ctx.user.id,
      title: 'Notification de test',
      body: 'Ceci est une notification de test',
      type: 'system',
    });

    return { success };
  }),
});
