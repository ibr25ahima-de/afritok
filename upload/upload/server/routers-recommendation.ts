/**
 * Routeurs tRPC pour la recommandation et le feed personnalisé
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getRecommendationEngine } from './recommendation-engine';

export const recommendationRouter = router({
  /**
   * Obtenir le feed personnalisé
   */
  getPersonalizedFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const engine = getRecommendationEngine();
      return await engine.generatePersonalizedFeed(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Obtenir le feed par défaut (tendances)
   */
  getDefaultFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const engine = getRecommendationEngine();
      return await engine.getDefaultFeed(input.limit, input.offset);
    }),

  /**
   * Obtenir les vidéos tendances
   */
  getTrendingVideos: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const engine = getRecommendationEngine();
      return await engine.getTrendingVideosPublic(input.category, input.limit, input.offset);
    }),

  /**
   * Obtenir les vidéos découverte
   */
  getDiscoveryVideos: publicProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const engine = getRecommendationEngine();
      return await engine.getDiscoveryVideos(input.limit, input.offset);
    }),

  /**
   * Obtenir le feed des utilisateurs suivis
   */
  getFollowingFeed: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const engine = getRecommendationEngine();
      return await engine.getFollowingFeed(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Enregistrer l'historique de visionnage
   */
  recordViewHistory: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        watchDuration: z.number(), // en secondes
        completionRate: z.number(), // en %
      })
    )
    .mutation(async ({ ctx, input }) => {
      const engine = getRecommendationEngine();
      await engine.recordViewHistory(
        ctx.user.id,
        input.videoId,
        input.watchDuration,
        input.completionRate
      );
      return { success: true };
    }),
});
