/**
 * Routeurs tRPC pour l'enregistrement vidéo
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure } from './_core/trpc';
import { z } from 'zod';
import { TRPCError } from '@trpc/server';
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
      // ✅ SÉCURISER USER
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }

      const manager = getVideoRecordingManager();

      // ✅ BLOQUER LE FAKE UPLOAD (OBLIGATOIRE)
      // On ne laisse PAS ça en prod.
      throw new Error("Upload vidéo non implémenté côté serveur");

      /* 
      // Code original mis en commentaire pour référence
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
        duration: input.duration, // ✅ AMÉLIORATION : utile pour feed + stats
      };
      */
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

      // ✅ BLOQUER LE FAKE UPLOAD (OBLIGATOIRE)
      throw new Error("Upload vidéo non implémenté côté serveur");

      /*
      // Code original mis en commentaire pour référence
      const blob = new Blob([], { type: input.mimeType });
      const result = await manager.validateVideoQuality(blob);
      return result;
      */
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
