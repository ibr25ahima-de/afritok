/**
 * Routeurs tRPC pour l'enregistrement vidéo
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { getVideoRecordingManager } from './video-recording';

export const videoRecordingRouter = router({
  /**
   * Traiter une vidéo enregistrée
   */
  processRecordedVideo: protectedProcedure
    .input(
      z.object({
        duration: z.number(),
        fileSize: z.number(),
        mimeType: z.string(),
        width: z.number().optional(),
        height: z.number().optional(),
        fps: z.number().optional(),
        bitrate: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getVideoRecordingManager();

      // TODO: Récupérer le blob de la requête multipart
      // Pour l'instant, créer un placeholder
      const blob = new Blob([], { type: input.mimeType });

      const result = await manager.processRecordedVideo(blob, {
        userId: ctx.user.id,
        duration: input.duration,
        fileSize: input.fileSize,
        mimeType: input.mimeType,
        width: input.width,
        height: input.height,
        fps: input.fps,
        bitrate: input.bitrate,
      });

      if (!result) {
        return { success: false, error: 'Failed to process video' };
      }

      return {
        success: true,
        videoId: result.videoId,
        url: result.url,
      };
    }),

  /**
   * Créer un brouillon d'enregistrement
   */
  createRecordingDraft: protectedProcedure.mutation(async ({ ctx }) => {
    const manager = getVideoRecordingManager();
    const draftId = await manager.createRecordingDraft(ctx.user.id);

    if (!draftId) {
      return { success: false, error: 'Failed to create draft' };
    }

    return { success: true, draftId };
  }),

  /**
   * Valider la qualité vidéo
   */
  validateVideoQuality: protectedProcedure
    .input(
      z.object({
        fileSize: z.number(),
        mimeType: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getVideoRecordingManager();

      // TODO: Récupérer le blob de la requête multipart
      const blob = new Blob([], { type: input.mimeType });

      const result = await manager.validateVideoQuality(blob);

      return result;
    }),

  /**
   * Obtenir les brouillons d'enregistrement
   */
  getUserRecordingDrafts: protectedProcedure.query(async ({ ctx }) => {
    const manager = getVideoRecordingManager();
    return await manager.getUserRecordingDrafts(ctx.user.id);
  }),

  /**
   * Annuler un brouillon d'enregistrement
   */
  cancelRecordingDraft: protectedProcedure
    .input(z.object({ draftId: z.string() }))
    .mutation(async ({ input }) => {
      const manager = getVideoRecordingManager();
      const success = await manager.cancelRecordingDraft(input.draftId);
      return { success };
    }),
});
