/**
 * Routeurs tRPC pour les analytics
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getAnalyticsManager } from './analytics';

export const analyticsRouter = router({
  /**
   * Obtenir les analytics vidéo
   */
  getVideoAnalytics: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      return await analyticsManager.getVideoAnalytics(input.videoId);
    }),

  /**
   * Obtenir les analytics créateur
   */
  getCreatorAnalytics: protectedProcedure.query(async ({ ctx }) => {
    const analyticsManager = getAnalyticsManager();
    return await analyticsManager.getCreatorAnalytics(ctx.user.id);
  }),

  /**
   * Obtenir les analytics quotidiennes
   */
  getDailyAnalytics: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      return await analyticsManager.getDailyAnalytics(
        input.videoId,
        input.startDate,
        input.endDate
      );
    }),

  /**
   * Obtenir les statistiques d'engagement
   */
  getEngagementStats: protectedProcedure.query(async ({ ctx }) => {
    const analyticsManager = getAnalyticsManager();
    return await analyticsManager.getEngagementStats(ctx.user.id);
  }),

  /**
   * Obtenir les vidéos les plus performantes
   */
  getTopVideos: protectedProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ ctx, input }) => {
      const analyticsManager = getAnalyticsManager();
      return await analyticsManager.getTopVideos(ctx.user.id, input.limit);
    }),

  /**
   * Incrémenter les vues vidéo
   */
  incrementVideoViews: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.incrementVideoViews(input.videoId);
      return { success: true };
    }),

  /**
   * Incrémenter les likes vidéo
   */
  incrementVideoLikes: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.incrementVideoLikes(input.videoId);
      return { success: true };
    }),

  /**
   * Décrémenter les likes vidéo
   */
  decrementVideoLikes: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.decrementVideoLikes(input.videoId);
      return { success: true };
    }),

  /**
   * Incrémenter les commentaires vidéo
   */
  incrementVideoComments: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.incrementVideoComments(input.videoId);
      return { success: true };
    }),

  /**
   * Incrémenter les partages vidéo
   */
  incrementVideoShares: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.incrementVideoShares(input.videoId);
      return { success: true };
    }),

  /**
   * Incrémenter les sauvegardes vidéo
   */
  incrementVideoSaves: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.incrementVideoSaves(input.videoId);
      return { success: true };
    }),

  /**
   * Enregistrer les analytics quotidiennes
   */
  recordDailyAnalytics: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        date: z.date(),
        views: z.number(),
        likes: z.number(),
        comments: z.number(),
        shares: z.number(),
        saves: z.number(),
      })
    )
    .mutation(async ({ input }) => {
      const analyticsManager = getAnalyticsManager();
      await analyticsManager.recordDailyAnalytics({
        videoId: input.videoId,
        date: input.date,
        views: input.views,
        likes: input.likes,
        comments: input.comments,
        shares: input.shares,
        saves: input.saves,
      });
      return { success: true };
    }),

  /**
   * Obtenir le dashboard du créateur
   */
  getCreatorDashboard: protectedProcedure.query(async ({ ctx }) => {
    const analyticsManager = getAnalyticsManager();

    const creatorAnalytics = await analyticsManager.getCreatorAnalytics(ctx.user.id);
    const engagementStats = await analyticsManager.getEngagementStats(ctx.user.id);
    const topVideos = await analyticsManager.getTopVideos(ctx.user.id, 5);

    return {
      analytics: creatorAnalytics,
      engagement: engagementStats,
      topVideos,
    };
  }),
});
