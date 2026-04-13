/**
 * Routeurs tRPC pour la recommandation et le feed personnalisé
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getRecommendationEngine } from './recommendation-engine';
// ✅ 1. IMPORTER le système de gains
import { recordWatchEarning } from "./micro-earnings";
import { getVideoById } from "./db";

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
      
      // Enregistrement dans le moteur de recommandation
      await engine.recordViewHistory(
        ctx.user.id,
        input.videoId,
        input.watchDuration,
        input.completionRate
      );

      // 💰 MONÉTISATION (CORRECTION TRÈS IMPORTANTE)
      if (input.watchDuration >= 5) {
        const video = await getVideoById(input.videoId);

        // Si la vidéo existe et n'appartient pas au spectateur actuel
        if (video && video.userId !== ctx.user.id) {
          await recordWatchEarning(
            video.userId, // 👉 créateur
            input.videoId,
            input.watchDuration
          );
        }
      }

      return { success: true };
    }),
});
