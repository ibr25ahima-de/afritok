import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import { instantWithdrawalRouter } from "./routers-instant-withdrawal";
import { monetizationRouter } from "./routers-monetization";
import { liveRouter } from "./routers-live";
import { liveChatRouter } from "./routers-live-chat";
import { likeRouter, commentRouter, favoriteRouter, shareRouter } from "./routers-interaction";

import {
  getUserVideos,
  getVideoById,
  getFeedVideos,
  getFollowerCount,
  getFollowingCount,
  isFollowing,
  getUserEarnings,
  getUserWithdrawals,
  db,
  createOTP,
  getValidOTP,
  deleteOTP,
  incrementOTPAttempts,
  getUserByPhone,
  upsertUser,
  createEarning,
} from "./db";

import {
  videos,
  followers,
  users,
  reports,
} from "../drizzle/schema";

import { eq, and, like } from "drizzle-orm";

// ============================================
// MAIN ROUTER
// ============================================

export const appRouter = router({
  system: systemRouter,
  live: liveRouter,
  liveChat: liveChatRouter,
  instantWithdrawal: instantWithdrawalRouter,
  monetization: monetizationRouter,

  // ============================================
  // AUTH
  // ============================================

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),

    requestOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input }) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await createOTP(input.phone, code);

        console.log(`[OTP] ${input.phone}: ${code}`);

        return { success: true, code };
      }),

    verifyOtp: publicProcedure
      .input(z.object({ phone: z.string(), code: z.string() }))
      .mutation(async ({ input, ctx }) => {
        const validOtp = await getValidOTP(input.phone, input.code);

        if (!validOtp) {
          throw new TRPCError({ code: "UNAUTHORIZED" });
        }

        let user = await getUserByPhone(input.phone);

        if (!user) {
          await upsertUser({
            phone: input.phone,
            name: `User ${input.phone.slice(-4)}`,
            loginMethod: "phone_otp",
            role: "user",
            lastSignedIn: new Date(),
          });

          user = await getUserByPhone(input.phone);
        }

        await deleteOTP(validOtp.id);

        const token = await sdk.createSessionToken(user!.id, user!.phone);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user };
      }),
  }),

  // ============================================
  // VIDEO
  // ============================================

  video: router({
    feed: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getFeedVideos(input.limit, input.offset, "forYou")),

    upload: protectedProcedure
      .input(z.object({
        title: z.string(),
        videoUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        await db.insert(videos).values({
          userId: ctx.user.id,
          title: input.title,
          videoUrl: input.videoUrl,
        });

        return { success: true };
      }),

    incrementViews: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ input }) => {
        const video = await getVideoById(input.videoId);
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });

        await db
          .update(videos)
          .set({ views: (video.views || 0) + 1 })
          .where(eq(videos.id, input.videoId));

        await createEarning(video.userId, 0.001, "views", input.videoId);

        return { success: true };
      }),
  }),

  // ============================================
  // INTERACTIONS
  // ============================================

  like: likeRouter,
  comment: commentRouter,
  favorite: favoriteRouter,
  share: shareRouter,

  // ============================================
  // FOLLOW
  // ============================================

  follower: router({
    toggle: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const following = await isFollowing(ctx.user.id, input.userId);

        if (following) {
          await db.delete(followers).where(
            and(
              eq(followers.followerId, ctx.user.id),
              eq(followers.followingId, input.userId)
            )
          );
          return { following: false };
        }

        await db.insert(followers).values({
          followerId: ctx.user.id,
          followingId: input.userId,
        });

        return { following: true };
      }),

    getCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => ({
        followers: await getFollowerCount(input.userId),
        following: await getFollowingCount(input.userId),
      })),
  }),

  // ============================================
  // EARNINGS
  // ============================================

  earnings: router({
    getMyEarnings: protectedProcedure.query(({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return getUserEarnings(ctx.user.id);
    }),

    getMyWithdrawals: protectedProcedure.query(({ ctx }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
      return getUserWithdrawals(ctx.user.id);
    }),
  }),

  // ============================================
  // USER
  // ============================================

  user: router({
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const result = await db
          .select()
          .from(users)
          .where(eq(users.id, input.userId));

        return result[0] || null;
      }),
  }),

  // ============================================
  // ADMIN
  // ============================================

  admin: router({
    getReports: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.select().from(reports);
    }),
  }),
});

export type AppRouter = typeof appRouter;
