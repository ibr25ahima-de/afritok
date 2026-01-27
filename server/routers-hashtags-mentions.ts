/**
 * Routeurs tRPC pour hashtags et mentions
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getHashtagsMentionsManager } from './hashtags-mentions';

export const hashtagsMentionsRouter = router({
  /**
   * Obtenir les hashtags tendances
   */
  getTrendingHashtags: publicProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getTrendingHashtags(input.limit, input.offset);
    }),

  /**
   * Rechercher des hashtags
   */
  searchHashtags: publicProcedure
    .input(
      z.object({
        query: z.string(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.searchHashtags(input.query, input.limit);
    }),

  /**
   * Obtenir les vidéos d'un hashtag
   */
  getVideosByHashtag: publicProcedure
    .input(
      z.object({
        hashtag: z.string(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getVideosByHashtag(input.hashtag, input.limit, input.offset);
    }),

  /**
   * Obtenir les statistiques d'un hashtag
   */
  getHashtagStats: publicProcedure
    .input(z.object({ hashtag: z.string() }))
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getHashtagStats(input.hashtag);
    }),

  /**
   * Obtenir les hashtags d'une vidéo
   */
  getVideoHashtags: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getVideoHashtags(input.videoId);
    }),

  /**
   * Ajouter un hashtag à une vidéo
   */
  addHashtagToVideo: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        hashtag: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      const success = await manager.addHashtagToVideo(input.videoId, input.hashtag);
      return { success };
    }),

  /**
   * Traiter les hashtags d'une description
   */
  processHashtagsFromDescription: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        description: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      await manager.processHashtagsFromDescription(input.videoId, input.description);
      return { success: true };
    }),

  /**
   * Obtenir les mentions d'une vidéo
   */
  getVideoMentions: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getVideoMentions(input.videoId);
    }),

  /**
   * Obtenir les mentions reçues par un utilisateur
   */
  getUserMentions: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getHashtagsMentionsManager();
      return await manager.getUserMentions(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Ajouter une mention
   */
  addMention: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        mentionedUserId: z.number(),
        timestamp: z.number().default(0),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getHashtagsMentionsManager();
      const success = await manager.addMention({
        videoId: input.videoId,
        mentionedUserId: input.mentionedUserId,
        creatorId: ctx.user.id,
        timestamp: input.timestamp,
      });
      return { success };
    }),

  /**
   * Incrémenter les vues d'un hashtag
   */
  incrementHashtagViews: publicProcedure
    .input(
      z.object({
        hashtag: z.string(),
        count: z.number().default(1),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getHashtagsMentionsManager();
      await manager.incrementHashtagViews(input.hashtag, input.count);
      return { success: true };
    }),
});
