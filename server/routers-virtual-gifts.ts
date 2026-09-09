/**
 * Routeurs tRPC pour les cadeaux virtuels et tips
 *
 * Legacy / non monté dans l'appRouter actif.
 * Les mutations financières historiques sont volontairement désactivées
 * jusqu'à l'intégration d'un vrai prestataire de paiement avec confirmation
 * serveur et signature webhook. Elles ne doivent jamais simuler un paiement.
 */

import { router, protectedProcedure, publicProcedure } from './_core/trpc';
import { TRPCError } from '@trpc/server';
import { z } from 'zod';
import { getVirtualGiftsManager } from './virtual-gifts';

const legacyPaymentDisabled = () => {
  throw new TRPCError({
    code: 'PRECONDITION_FAILED',
    message: 'Les paiements réels de cette ancienne route sont désactivés jusqu’à l’intégration sécurisée d’un prestataire de paiement.',
  });
};

export const virtualGiftsRouter = router({
  /** Obtenir le catalogue de cadeaux */
  getGiftCatalog: publicProcedure.query(async () => {
    const manager = getVirtualGiftsManager();
    return manager.getGiftCatalog();
  }),

  /** Obtenir un cadeau par ID */
  getGift: publicProcedure
    .input(z.object({ giftId: z.string().min(1).max(150) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getGift(input.giftId);
    }),

  /** Obtenir les cadeaux par catégorie */
  getGiftsByCategory: publicProcedure
    .input(z.object({ category: z.enum(['common', 'rare', 'epic', 'legendary']) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getGiftsByCategory(input.category);
    }),

  /**
   * Ancienne mutation de paiement : désactivée.
   * Le client ne peut pas choisir un moyen de paiement et faire croire
   * au serveur qu'une opération financière a été confirmée.
   */
  sendGift: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().int().positive(),
        giftId: z.string().min(1).max(150),
        videoId: z.number().int().positive().optional(),
        message: z.string().max(500).optional(),
        paymentMethod: z.enum(['stripe', 'mtn', 'orange', 'wave', 'airtel']).optional(),
      })
    )
    .mutation(async () => legacyPaymentDisabled()),

  /** Ancienne mutation de tip : désactivée. */
  sendTip: protectedProcedure
    .input(
      z.object({
        recipientId: z.number().int().positive(),
        amount: z.number().finite().positive().max(1_000_000),
        currency: z.string().trim().min(3).max(10).default('XOF'),
        videoId: z.number().int().positive().optional(),
        message: z.string().max(500).optional(),
        paymentMethod: z.enum(['stripe', 'mtn', 'orange', 'wave', 'airtel']).optional(),
      })
    )
    .mutation(async () => legacyPaymentDisabled()),

  /** Obtenir l'historique des cadeaux reçus */
  getReceivedGifts: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).max(1_000_000).default(0) }))
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getReceivedGifts(ctx.user.id, input.limit, input.offset);
    }),

  /** Obtenir l'historique des cadeaux envoyés */
  getSentGifts: protectedProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(20), offset: z.number().int().min(0).max(1_000_000).default(0) }))
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getSentGifts(ctx.user.id, input.limit, input.offset);
    }),

  /** Obtenir les revenus totaux des cadeaux */
  getTotalGiftEarnings: protectedProcedure.query(async ({ ctx }) => {
    const manager = getVirtualGiftsManager();
    const earnings = await manager.getTotalGiftEarnings(ctx.user.id);
    return { earnings };
  }),

  /** Obtenir les revenus des cadeaux par période */
  getGiftEarningsByPeriod: protectedProcedure
    .input(z.object({ startDate: z.date(), endDate: z.date() }))
    .query(async ({ ctx, input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getGiftEarningsByPeriod(ctx.user.id, input.startDate, input.endDate);
    }),

  /** Obtenir les cadeaux les plus populaires */
  getPopularGifts: publicProcedure
    .input(z.object({ limit: z.number().int().min(1).max(100).default(10) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getPopularGifts(input.limit);
    }),

  /** Obtenir les cadeaux les plus reçus par un utilisateur */
  getMostReceivedGifts: publicProcedure
    .input(z.object({ userId: z.number().int().positive(), limit: z.number().int().min(1).max(100).default(10) }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getMostReceivedGifts(input.userId, input.limit);
    }),

  /** Obtenir les statistiques de cadeaux */
  getGiftStatistics: protectedProcedure.query(async ({ ctx }) => {
    const manager = getVirtualGiftsManager();
    return manager.getGiftStatistics(ctx.user.id);
  }),

  /** Obtenir les statistiques de cadeaux d'une vidéo */
  getVideoGiftStats: publicProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .query(async ({ input }) => {
      const manager = getVirtualGiftsManager();
      return manager.getVideoGiftStats(input.videoId);
    }),

  /**
   * Ancienne création de cadeau avec prix libre : désactivée.
   * Un utilisateur ne doit jamais pouvoir créer lui-même un produit
   * monétisé ou fixer sa valeur financière.
   */
  addCustomGift: protectedProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(100),
        description: z.string().max(500).optional(),
        price: z.number().finite().positive().max(1_000_000),
        currency: z.string().trim().min(3).max(10),
        emoji: z.string().max(32).optional(),
        imageUrl: z.string().url().max(2048).optional(),
        category: z.enum(['common', 'rare', 'epic', 'legendary']),
      })
    )
    .mutation(async () => legacyPaymentDisabled()),
});
