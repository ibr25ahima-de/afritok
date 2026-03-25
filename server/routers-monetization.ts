import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { MONETIZATION } from "./monetization-config";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { videos as videosTable } from "../drizzle/schema";
import { db, getUserById, getUserVideos, getUserEarnings, createWithdrawalRecord, getFollowerCount } from "./db";

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
    const userVideos = await getUserVideos(ctx.user.id);

    return {
      balance: user?.totalEarnings || "0",
      totalWithdrawals: user?.totalWithdrawals || "0",
      totalVideos: userVideos.length,
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
   * 📊 Full monetization status (UI)
   */
  getFullMonetizationStatus: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.user.id;

    const user = await getUserById(userId);
    const videos = await getUserVideos(userId);
    const followers = await getFollowerCount(userId);

    // vues 30 jours
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsResult = await db
      .select({
        total: sql<number>`SUM(${videosTable.views})`,
      })
      .from(videosTable)
      .where(
        and(
          eq(videosTable.userId, userId),
          gt(videosTable.createdAt, thirtyDaysAgo)
        )
      );

    const views30Days = Number(viewsResult[0]?.total || 0);

    // éligibilité
    const eligible =
      followers >= (MONETIZATION.creator as any).minFollowers &&
      views30Days >= (MONETIZATION.creator as any).minViews30Days;

    return {
      balance: user?.totalEarnings || "0",

      userEarnings: MONETIZATION.rewards,
      dailyLimits: MONETIZATION.dailyLimits,

      creator: {
        eligible,
        requirements: MONETIZATION.creator,
        stats: {
          followers,
          views30Days,
          totalVideos: videos.length,
        },
      },

      withdrawal: MONETIZATION.withdrawal,
      methods: MONETIZATION.methods,
      rules: MONETIZATION.rules,
    };
  }),

  /**
   * 📊 Infos complètes de monétisation (PROFIL)
   */
  getMonetizationInfo: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.user.id;

    // 👤 user
    const user = await getUserById(userId);

    // 🎥 vidéos
    const userVideos = await getUserVideos(userId);

    // 👥 followers réels
    const followers = await getFollowerCount(userId);

    // 👁️ vues sur 30 jours (toutes ses vidéos)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsResult = await db
      .select({
        total: sql<number>`SUM(${videosTable.views})`,
      })
      .from(videosTable)
      .where(
        and(
          eq(videosTable.userId, userId),
          gt(videosTable.createdAt, thirtyDaysAgo)
        )
      );

    const views30Days = Number(viewsResult[0]?.total || 0);

    // 🎯 conditions
    const eligible =
      followers >= (MONETIZATION.creator as any).minFollowers &&
      views30Days >= (MONETIZATION.creator as any).minViews30Days;

    return {
      balance: user?.totalEarnings || "0",

      stats: {
        followers,
        views30Days,
        totalVideos: userVideos.length,
      },

      creator: {
        eligible,
        requirements: MONETIZATION.creator,
      },

      config: MONETIZATION,
    };
  }),

  /**
   * 🧠 Vérification simple (anti abus)
   */
  checkEligibility: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

    const userId = ctx.user.id;

    const user = await getUserById(userId);
    const userVideos = await getUserVideos(userId);

    const hasVideos = userVideos.length >= 1;

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
        totalVideos: userVideos.length,
        balance: user?.totalEarnings || "0",
      },
    };
  }),
});
