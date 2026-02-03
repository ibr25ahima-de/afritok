/**
 * Routeurs tRPC pour les filtres et effets AR
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getARFiltersManager } from './ar-filters';

export const arFiltersRouter = router({
  /**
   * Obtenir les filtres prédéfinis
   */
  getPredefinedFilters: publicProcedure.query(async () => {
    const manager = getARFiltersManager();
    return manager.getPredefinedFilters();
  }),

  /**
   * Obtenir les presets de filtres
   */
  getFilterPresets: publicProcedure
    .input(
      z.object({
        category: z.string().optional(),
      })
    )
    .query(async ({ input }) => {
      const manager = getARFiltersManager();
      return manager.getFilterPresets(input.category);
    }),

  /**
   * Obtenir un preset par ID
   */
  getFilterPreset: publicProcedure
    .input(z.object({ presetId: z.string() }))
    .query(async ({ input }) => {
      const manager = getARFiltersManager();
      return manager.getFilterPreset(input.presetId);
    }),

  /**
   * Obtenir les catégories de presets
   */
  getPresetCategories: publicProcedure.query(async () => {
    const manager = getARFiltersManager();
    return manager.getPresetCategories();
  }),

  /**
   * Valider une configuration de filtre
   */
  validateFilterConfig: publicProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string(),
        type: z.enum(['color', 'blur', 'brightness', 'contrast', 'saturate', 'hueRotate', 'sepia', 'invert']),
        value: z.number(),
        min: z.number(),
        max: z.number(),
        unit: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getARFiltersManager();
      const isValid = manager.validateFilterConfig(input);
      return { isValid };
    }),

  /**
   * Détecter les visages dans une image
   */
  detectFaces: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string(),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getARFiltersManager();

      // TODO: Récupérer l'image depuis imageUrl
      const faces = await manager.detectFaces(Buffer.from(''));

      return { success: faces !== null, faces: faces || [] };
    }),

  /**
   * Sauvegarder un preset personnalisé
   */
  saveCustomPreset: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        filters: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['color', 'blur', 'brightness', 'contrast', 'saturate', 'hueRotate', 'sepia', 'invert']),
            value: z.number(),
            min: z.number(),
            max: z.number(),
            unit: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getARFiltersManager();
      const presetId = await manager.saveCustomPreset(ctx.user.id, {
        name: input.name,
        description: input.description,
        filters: input.filters,
        category: 'custom',
      });

      if (!presetId) {
        return { success: false, error: 'Failed to save preset' };
      }

      return { success: true, presetId };
    }),

  /**
   * Obtenir les presets personnalisés
   */
  getUserCustomPresets: protectedProcedure.query(async ({ ctx }) => {
    const manager = getARFiltersManager();
    return await manager.getUserCustomPresets(ctx.user.id);
  }),

  /**
   * Supprimer un preset personnalisé
   */
  deleteCustomPreset: protectedProcedure
    .input(z.object({ presetId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const manager = getARFiltersManager();
      const success = await manager.deleteCustomPreset(ctx.user.id, input.presetId);
      return { success };
    }),
});
