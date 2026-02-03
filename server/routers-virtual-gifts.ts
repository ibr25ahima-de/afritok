/**
 * Routeurs tRPC pour les cadeaux virtuels et tips
 * 
 * À intégrer dans server/routers.ts
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { z } from 'zod';
import { getVirtualGiftsManager } from './virtual-gifts';

export const virtualGiftsRouter = router({
  /**
   * Obtenir le catalogue de cadeaux
   */
  getGiftCatalog: publicProcedure.query(async () => {
    const manager = getVirtualGiftsManager();
    return manager.getGiftCatalog();
  }),

  /**
   * Obtenir un cadeau par ID
   */
  getGift: publicProcedure
    .input(z.object({ giftId: z.string() }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getGift(input.giftId);
    }),

  /**
   * Obtenir les cadeaux par catégorie
   */
  getGiftsByCategory: publicProcedure
    .input(z.object({ category: z.enum(['common', 'rare', 'epic', 'legendary']) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getGiftsByCategory(input.category);
    }),

  /**
   * Envoyer un cadeau
   */
  sendGift: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        giftId: z.string(),
        videoId: z.number().optional(),
        message: z.string().optional(),
        paymentMethod: z.enum(['stripe', 'mtn', 'orange', 'wave', 'airtel']).default('stripe'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      const transaction = await manager.sendGift(
        ctx.user.id,
        input.recipientId,
        input.giftId,
        input.videoId,
        input.message,
        input.paymentMethod
      );

      if (!transaction) {
        return { success: false, error: 'Failed to send gift' };
      }

      return { success: true, transaction };
    }),

  /**
   * Envoyer un tip
   */
  sendTip: protectedProcedure
    .input(
      z.object({
        recipientId: z.number(),
        amount: z.number(), // en cents
        currency: z.string().default('USD'),
        videoId: z.number().optional(),
        message: z.string().optional(),
        paymentMethod: z.enum(['stripe', 'mtn', 'orange', 'wave', 'airtel']).default('stripe'),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      const transaction = await manager.sendTip(
        ctx.user.id,
        input.recipientId,
        input.amount,
        input.currency,
        input.videoId,
        input.message,
        input.paymentMethod
      );

      if (!transaction) {
        return { success: false, error: 'Failed to send tip' };
      }

      return { success: true, transaction };
    }),

  /**
   * Obtenir l'historique des cadeaux reçus
   */
  getReceivedGifts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getReceivedGifts(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Obtenir l'historique des cadeaux envoyés
   */
  getSentGifts: protectedProcedure
    .input(
      z.object({
        limit: z.number().default(20),
        offset: z.number().default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getSentGifts(ctx.user.id, input.limit, input.offset);
    }),

  /**
   * Obtenir les revenus totaux des cadeaux
   */
  getTotalGiftEarnings: protectedProcedure.query(async ({ ctx }) => {
    const manager = getVirtualGiftsManager();
    const earnings = await manager.getTotalGiftEarnings(ctx.user.id);
    return { earnings };
  }),

  /**
   * Obtenir les revenus des cadeaux par période
   */
  getGiftEarningsByPeriod: protectedProcedure
    .input(
      z.object({
        startDate: z.date(),
        endDate: z.date(),
      })
    )
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getGiftEarningsByPeriod(ctx.user.id, input.startDate, input.endDate);
    }),

  /**
   * Obtenir les cadeaux les plus populaires
   */
  getPopularGifts: publicProcedure
    .input(z.object({ limit: z.number().default(10) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getPopularGifts(input.limit);
    }),

  /**
   * Obtenir les cadeaux les plus reçus par un utilisateur
   */
  getMostReceivedGifts: publicProcedure
    .input(
      z.object({
        userId: z.number(),
        limit: z.number().default(10),
      })
    )
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getMostReceivedGifts(input.userId, input.limit);
    }),

  /**
   * Obtenir les statistiques de cadeaux
   */
  getGiftStatistics: protectedProcedure.query(async ({ ctx }) => {
    const manager = getVirtualGiftsManager();
    return await manager.getGiftStatistics(ctx.user.id);
  }),

  /**
   * Obtenir les statistiques de cadeaux d'une vidéo
   */
  getVideoGiftStats: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return await manager.getVideoGiftStats(input.videoId);
    }),

  /**
   * Ajouter un cadeau personnalisé
   */
  addCustomGift: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        price: z.number(),
        currency: z.string(),
        emoji: z.string().optional(),
        imageUrl: z.string().optional(),
        category: z.enum(['common', 'rare', 'epic', 'legendary']),
      })
    )
    .mutation(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      const giftId = await manager.addCustomGift({
        name: input.name,
        description: input.description,
        price: input.price,
        currency: input.currency,
        emoji: input.emoji,
        imageUrl: input.imageUrl,
        category: input.category,
        creatorShare: 50,
      });

      if (!giftId) {
        return { success: false, error: 'Failed to add custom gift' };
      }

      return { success: true, giftId };
    }),
});
