/**
 * Routeurs tRPC pour duets et stitches
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getDuetsStitchesManager, DuetLayout } from './duets-stitches';
import { getWebSocketManager } from './websocket';

export const duetsStitchesRouter = router({
  /**
   * Créer un duet
   */
  createDuet: protectedProcedure
    .input(
      z.object({
        originalVideoId: z.number(),
        duetVideoId: z.number(),
        layout: z.enum(['side-by-side', 'picture-in-picture', 'split']),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getDuetsStitchesManager();
      const wsManager = getWebSocketManager();

      const success = await manager.createDuet({
        originalVideoId: input.originalVideoId,
        duetVideoId: input.duetVideoId,
        layout: input.layout as DuetLayout,
      });

      if (success) {
        // TODO: Obtenir le creatorId de la vidéo originale et notifier
        wsManager.broadcastEvent({
          type: 'duet:created' as any,
          data: {
            originalVideoId: input.originalVideoId,
            duetVideoId: input.duetVideoId,
            creatorId: ctx.user.id,
          },
          timestamp: new Date(),
        });
      }

      return { success };
    }),

  /**
   * Créer un stitch
   */
  createStitch: protectedProcedure
    .input(
      z.object({
        originalVideoId: z.number(),
        stitchVideoId: z.number(),
        clipStartTime: z.number(),
        clipEndTime: z.number(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getDuetsStitchesManager();
      const wsManager = getWebSocketManager();

      const success = await manager.createStitch({
        originalVideoId: input.originalVideoId,
        stitchVideoId: input.stitchVideoId,
        clipStartTime: input.clipStartTime,
        clipEndTime: input.clipEndTime,
      });

      if (success) {
        // TODO: Obtenir le creatorId de la vidéo originale et notifier
        wsManager.broadcastEvent({
          type: 'stitch:created' as any,
          data: {
            originalVideoId: input.originalVideoId,
            stitchVideoId: input.stitchVideoId,
            creatorId: ctx.user.id,
          },
          timestamp: new Date(),
        });
      }

      return { success };
    }),

  /**
   * Obtenir les duets d'une vidéo
   */
  getVideoDuets: publicProcedure
    .input(
      z.object({
        videoId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getVideoDuets(input.videoId, input.limit, input.offset);
    }),

  /**
   * Obtenir les stitches d'une vidéo
   */
  getVideoStitches: publicProcedure
    .input(
      z.object({
        videoId: z.number(),
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getVideoStitches(input.videoId, input.limit, input.offset);
    }),

  /**
   * Obtenir les informations du duet d'une vidéo
   */
  getVideoDuetInfo: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getVideoDuetInfo(input.videoId);
    }),

  /**
   * Obtenir les informations du stitch d'une vidéo
   */
  getVideoStitchInfo: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getVideoStitchInfo(input.videoId);
    }),

  /**
   * Supprimer un duet
   */
  deleteDuet: protectedProcedure
    .input(z.object({ duetVideoId: z.number() }))
    .mutation(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      const success = await manager.deleteDuet(input.duetVideoId);
      return { success };
    }),

  /**
   * Supprimer un stitch
   */
  deleteStitch: protectedProcedure
    .input(z.object({ stitchVideoId: z.number() }))
    .mutation(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      const success = await manager.deleteStitch(input.stitchVideoId);
      return { success };
    }),

  /**
   * Obtenir les duets créés par un utilisateur
   */
  getUserDuets: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getUserDuets(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Obtenir les stitches créés par un utilisateur
   */
  getUserStitches: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getUserStitches(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Obtenir les statistiques de collaboration d'une vidéo
   */
  getVideoCollaborationStats: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getDuetsStitchesManager();
      return await manager.getVideoCollaborationStats(input.videoId);
    }),

  /**
   * Obtenir les layouts disponibles
   */
  getAvailableLayouts: publicProcedure.query(async () => {
    const manager = getDuetsStitchesManager();
    return manager.getAvailableLayouts();
  }),
});
