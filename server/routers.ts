import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  getUserVideos,
  getVideoById,
  getFeedVideos,
  getUserLike,
  getVideoComments,
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
} from "./db";
import { videos, likes, comments, followers, earnings, withdrawals, users, reports } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";
import { uploadVideoToStorage } from "./videoUpload";
import { createDonationIntent, createPaymentSession } from "./stripe";
import { liveRouter } from "./routers-live";
import { liveChatRouter } from "./routers-live-chat";

export const appRouter = router({
  system: systemRouter,
  live: liveRouter,
  liveChat: liveChatRouter,

  // ========================
  // AUTH
  // ========================
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),

    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),

    requestOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input }) => {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await createOTP(input.phone, code);
        console.log(`[OTP] Code for ${input.phone}: ${code}`);
        return { success: true, code, message: "OTP sent successfully" };
      }),

    verifyOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10), code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        const validOtp = await getValidOTP(input.phone, input.code);
        if (!validOtp) throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid or expired OTP" });

        if (validOtp.attempts >= 5) {
          await deleteOTP(validOtp.id);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Too many failed attempts. Request new OTP" });
        }

        if (validOtp.code !== input.code) {
          await incrementOTPAttempts(validOtp.id);
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Invalid OTP code" });
        }

        let user = await getUserByPhone(input.phone);
        if (!user) {
          await upsertUser({
            phone: input.phone,
            name: `User ${input.phone.slice(-4)}`,
            email: null,
            loginMethod: "phone_otp",
            role: "user",
            lastSignedIn: new Date(),
          });
          user = await getUserByPhone(input.phone);
        } else {
          await upsertUser({ id: user.id, lastSignedIn: new Date() });
        }

        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to retrieve user" });

        await deleteOTP(validOtp.id);
        const token = await sdk.createSessionToken(user.id, user.phone);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, cookieOptions);

        return { success: true, user, message: "Login successful" };
      }),
  }),

  // ========================
  // VIDEO
  // ========================
  video: router({
    feed: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getFeedVideos(input.limit, input.offset)),

    getById: publicProcedure.input(z.object({ id: z.number() })).query(({ input }) => getVideoById(input.id)),

    getUserVideos: publicProcedure.input(z.object({ userId: z.number() })).query(({ input }) => getUserVideos(input.userId)),

    upload: protectedProcedure
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          file: z.any(), // ✅ allow Buffer/stream for Node.js
          thumbnailFile: z.any().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const { videoUrl, thumbnailUrl, duration } = await uploadVideoToStorage(input.file, input.thumbnailFile);

          const result = await db.insert(videos).values({
            userId: ctx.user.id,
            title: input.title,
            description: input.description,
            videoUrl,
            thumbnailUrl,
            duration,
            isPublic: true,
          });

          return { success: true, videoId: result.insertId };
        } catch (err) {
          console.error("[Video] Upload failed:", err);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload video" });
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const video = await getVideoById(input.id);
        if (!video || video.userId !== ctx.user.id) throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this video" });

        await db.delete(videos).where(eq(videos.id, input.id));
        return { success: true };
      }),
  }),

  // ========================
  // LIKE
  // ========================
  like: router({
    toggle: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        const existingLike = await getUserLike(ctx.user.id, input.videoId);
        if (existingLike) {
          await db.delete(likes).where(eq(likes.id, existingLike.id));
          return { liked: false };
        } else {
          await db.insert(likes).values({ userId: ctx.user.id, videoId: input.videoId });
          return { liked: true };
        }
      }),

    isLiked: publicProcedure
      .input(z.object({ videoId: z.number(), userId: z.number() }))
      .query(({ input }) => getUserLike(input.userId, input.videoId).then((like) => !!like)),
  }),

  // ========================
  // COMMENT
  // ========================
  comment: router({
    getByVideo: publicProcedure.input(z.object({ videoId: z.number() })).query(({ input }) => getVideoComments(input.videoId)),

    create: protectedProcedure
      .input(z.object({ videoId: z.number(), text: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const result = await db.insert(comments).values({ userId: ctx.user.id, videoId: input.videoId, text: input.text });
        return { success: true, commentId: result.insertId };
      }),
  }),

  // ========================
  // FOLLOWER
  // ========================
  follower: router({
    toggle: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        const isFollowingNow = await isFollowing(ctx.user.id, input.userId);

        if (isFollowingNow) {
          await db.delete(followers).where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId)));
          return { following: false };
        } else {
          await db.insert(followers).values({ followerId: ctx.user.id, followingId: input.userId });
          return { following: true };
        }
      }),

    getCount: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => ({
      followers: await getFollowerCount(input.userId),
      following: await getFollowingCount(input.userId),
    })),
  }),

  // ========================
  // EARNINGS
  // ========================
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

  // ========================
  // MONETIZATION
  // ========================
  monetization: router({
    createDonation: protectedProcedure
      .input(z.object({ videoId: z.number(), amount: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await createDonationIntent(input.amount, input.videoId, ctx.user.id);
      }),

    createPaymentSession: protectedProcedure
      .input(z.object({ amount: z.number().min(1), description: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        return await createPaymentSession(input.amount, input.description, ctx.user.id);
      }),
  }),

  // ========================
  // USER PROFILE
  // ========================
  user: router({
    getProfile: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      const result = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      return result.length > 0 ? result[0] : null;
    }),

    updateProfile: protectedProcedure
      .input(z.object({ name: z.string().optional(), bio: z.string().optional(), avatarUrl: z.string().optional(), country: z.string().optional(), currency: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });
        await db.update(users).set({ ...input, updatedAt: new Date() }).where(eq(users.id, ctx.user.id));
        return { success: true };
      }),
  }),

  // ========================
  // SEARCH
  // ========================
  search: router({
    videos: publicProcedure.input(z.object({ query: z.string().min(1), limit: z.number().default(20) })).query(async ({ input }) => {
      return db.select().from(videos).where(and(eq(videos.isPublic, true), like(videos.title, `%${input.query}%`))).limit(input.limit);
    }),
  }),

  // ========================
  // ADMIN
  // ========================
  admin: router({
    getReports: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
      return db.select().from(reports).orderBy((r) => r.createdAt);
    }),

    resolveReport: protectedProcedure
      .input(z.object({ reportId: z.number(), status: z.enum(["resolved", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN" });
        await db.update(reports).set({ status: input.status }).where(eq(reports.id, input.reportId));
        return { success: true };
      }),
  }),
});

export type AppRouter = typeof appRouter;
