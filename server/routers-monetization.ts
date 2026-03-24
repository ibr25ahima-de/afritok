import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { MONETIZATION } from "./monetization-config";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  getUserById,
  getUserVideos,
  getUserEarnings,
  createWithdrawalRecord,
} from "./db";

/**
 * ============================================
 * MONETIZATION ROUTER (FINAL VERSION STABLE)
 * ============================================
 */

export const monetizationRouter = router({
  /**
   * 📊 Dashboard utilisateur
   */
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const user = await getUserById(ctx.user.id);
    const videos = await getUserVideos(ctx.user.id);

    return {
      balance: user?.totalEarnings || "0",
      totalWithdrawals: user?.totalWithdrawals || "0",
      totalVideos: videos.length,
    };
  }),

  /**
   * 📈 Earnings list
   */
  myEarnings: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    return getUserEarnings(ctx.user.id);
  }),

  /**
   * 💸 Withdraw money (AUTO)
   */
  withdraw: protectedProcedure
    .input(
      z.object({
        amount: z.number().min(0.1),
        paymentMethod: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await createWithdrawalRecord(
        ctx.user.id,
        input.amount,
        input.paymentMethod
      );

      return { success: true };
    }),

  /**
   * 📢 Config global (affichage UI)
   */
  getConfig: publicProcedure.query(() => {
    return MONETIZATION;
  }),

  /**
   * 📊 Infos complètes de monétisation (PROFIL)
   */
  getMonetizationInfo: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.user.id;

    const user = await getUserById(userId);
    const videos = await getUserVideos(userId);

    // ⚠️ temporaire (on connectera après aux vraies stats)
    const followers = 0;
    const views30Days = 0;

    const eligible =
      followers >= (MONETIZATION as any).creator.requirements?.minFollowers &&
      views30Days >= (MONETIZATION as any).creator.requirements?.minViews30Days;

    return {
      config: MONETIZATION,

      userStats: {
        followers,
        views30Days,
        totalVideos: videos.length,
        balance: user?.totalEarnings || "0",
      },

      creator: {
        eligible,
        requirements: (MONETIZATION as any).creator.requirements,
      },
    };
  }),

  /**
   * 🧠 Vérification simple (anti abus)
   */
  checkEligibility: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.user.id;

    const user = await getUserById(userId);
    const videos = await getUserVideos(userId);

    const hasVideos = videos.length >= 1;

    let canEarn = true;
    let reason = "OK";

    if (!hasVideos) {
      canEarn = false;
      reason = "Tu dois publier au moins 1 vidéo pour débloquer les gains.";
    }

    return {
      canEarn,
      reason,
      stats: {
        totalVideos: videos.length,
        balance: user?.totalEarnings || "0",
      },
    };
  }),
});
