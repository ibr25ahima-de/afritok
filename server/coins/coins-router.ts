import {
  router,
  protectedProcedure,
  publicProcedure,
} from "../_core/trpc";
import { z } from "zod";
import {
  getUserCoins,
  getCoinBalance,
  getCoinTransactions,
} from "./coin-service";
import { getActiveGifts, sendGift } from "./gifts-service";

export const coinsRouter = router({
  getWallet: protectedProcedure.query(async ({ ctx }) => {
    const wallet = await getUserCoins(ctx.user.id);
    return {
      id: wallet.id,
      userId: wallet.userId,
      balance: Number(wallet.balance),
      totalPurchased: Number(wallet.totalPurchased),
      totalSpent: Number(wallet.totalSpent),
      createdAt: wallet.createdAt,
      updatedAt: wallet.updatedAt,
    };
  }),

  getBalance: protectedProcedure.query(async ({ ctx }) => ({
    balance: await getCoinBalance(ctx.user.id),
  })),

  getPackages: publicProcedure.query(async () => {
    const { getCoinPackages } = await import("./purchase-service");
    return getCoinPackages();
  }),

  purchase: protectedProcedure
    .input(z.object({
      packageId: z.string().trim().min(1).max(50),
      paymentReference: z.string().trim().min(5).max(150),
    }))
    .mutation(async ({ ctx, input }) => {
      const { purchaseCoins } = await import("./purchase-service");
      return purchaseCoins({
        userId: ctx.user.id,
        packageId: input.packageId,
        paymentReference: input.paymentReference,
      });
    }),

  getTransactions: protectedProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(100).default(50),
    }))
    .query(async ({ ctx, input }) => {
      const transactions = await getCoinTransactions(ctx.user.id, input.limit);
      return transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: Number(transaction.amount),
        balanceBefore: Number(transaction.balanceBefore),
        balanceAfter: Number(transaction.balanceAfter),
        referenceId: transaction.referenceId,
        description: transaction.description,
        createdAt: transaction.createdAt,
      }));
    }),

  getActiveGifts: publicProcedure.query(async () => {
    const gifts = await getActiveGifts();
    return gifts.map((gift) => ({
      id: gift.id,
      name: gift.name,
      icon: gift.icon,
      coins: Number(gift.price),
      isActive: gift.isActive,
    }));
  }),

  sendGift: protectedProcedure
    .input(z.object({
      recipientId: z.number().int().positive(),
      giftId: z.number().int().positive(),
      quantity: z.number().int().min(1).max(100),
      context: z.enum(["video", "live"]),
      contextId: z.string().trim().min(1).max(100),
      idempotencyKey: z.string().trim().min(16).max(150),
    }))
    .mutation(async ({ ctx, input }) => {
      const numericContextId = Number(input.contextId);
      if (!Number.isSafeInteger(numericContextId) || numericContextId <= 0) {
        throw new Error("Contexte de cadeau invalide.");
      }

      const result = await sendGift(
        ctx.user.id,
        input.recipientId,
        input.giftId,
        input.quantity,
        input.context === "video" ? numericContextId : null,
        input.context === "live" ? numericContextId : null,
        input.idempotencyKey
      );

      const balance = await getCoinBalance(ctx.user.id);
      return { ...result, balance };
    }),
});
