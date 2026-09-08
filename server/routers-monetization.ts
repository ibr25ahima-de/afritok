import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { MONETIZATION } from "./monetization-config";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, eq, gt, sql } from "drizzle-orm";
import { videos as videosTable } from "../drizzle/schema";
import { db, getUserById, getUserVideos, getUserEarnings, createWithdrawalRecord, getFollowerCount } from "./db";

const withdrawalInput = z.object({
  amount: z.number().finite().positive().max(1000),
  paymentMethod: z.enum(["MTN", "ORANGE", "WAVE"]),
});

export const monetizationRouter = router({
  dashboard: protectedProcedure.query(async ({ ctx }) => {
    const user = await getUserById(ctx.user.id);
    const userVideos = await getUserVideos(ctx.user.id);

    return {
      balance: user?.totalEarnings || "0",
      totalWithdrawals: user?.totalWithdrawals || "0",
      totalVideos: userVideos.length,
    };
  }),

  myEarnings: protectedProcedure.query(async ({ ctx }) => {
    return getUserEarnings(ctx.user.id);
  }),

  withdraw: protectedProcedure
    .input(withdrawalInput)
    .mutation(async ({ ctx, input }) => {
      const user = await getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const balance =
        Number(user.totalEarnings || 0) - Number(user.totalWithdrawals || 0);
      const minimum = Math.max(0.1, Number(MONETIZATION.withdrawal?.minAmount ?? 0.1));

      if (!Number.isFinite(balance) || input.amount < minimum) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Montant minimum de retrait : ${minimum}`,
        });
      }

      if (input.amount > balance) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Solde insuffisant" });
      }

      try {
        await createWithdrawalRecord(
          ctx.user.id,
          input.amount,
          input.paymentMethod,
        );
      } catch (error) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            error instanceof Error && error.message === "Insufficient balance"
              ? "Solde insuffisant"
              : "Impossible d'enregistrer le retrait",
        });
      }

      return {
        success: true,
        message: "Demande de retrait enregistrée et en attente de confirmation.",
      };
    }),

  getConfig: publicProcedure.query(() => MONETIZATION),

  getFullMonetizationStatus: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);
    const videos = await getUserVideos(userId);
    const followers = await getFollowerCount(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsResult = await db
      .select({ total: sql<number>`SUM(${videosTable.views})` })
      .from(videosTable)
      .where(
        and(
          eq(videosTable.userId, userId),
          gt(videosTable.createdAt, thirtyDaysAgo),
        ),
      );

    const views30Days = Number(viewsResult[0]?.total || 0);
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
        stats: { followers, views30Days, totalVideos: videos.length },
      },
      withdrawal: MONETIZATION.withdrawal,
      methods: MONETIZATION.methods,
      rules: MONETIZATION.rules,
    };
  }),

  getMonetizationInfo: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);
    const userVideos = await getUserVideos(userId);
    const followers = await getFollowerCount(userId);

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const viewsResult = await db
      .select({ total: sql<number>`SUM(${videosTable.views})` })
      .from(videosTable)
      .where(
        and(
          eq(videosTable.userId, userId),
          gt(videosTable.createdAt, thirtyDaysAgo),
        ),
      );

    const views30Days = Number(viewsResult[0]?.total || 0);
    const eligible =
      followers >= (MONETIZATION.creator as any).minFollowers &&
      views30Days >= (MONETIZATION.creator as any).minViews30Days;

    return {
      balance: user?.totalEarnings || "0",
      stats: { followers, views30Days, totalVideos: userVideos.length },
      creator: { eligible, requirements: MONETIZATION.creator },
      config: MONETIZATION,
    };
  }),

  checkEligibility: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.user.id;
    const user = await getUserById(userId);
    const userVideos = await getUserVideos(userId);
    const hasVideos = userVideos.length >= 1;

    return {
      canEarn: hasVideos,
      reason: hasVideos
        ? "OK"
        : "Tu dois publier au moins 1 vidéo pour débloquer les gains.",
      stats: {
        totalVideos: userVideos.length,
        balance: user?.totalEarnings || "0",
      },
    };
  }),
});
