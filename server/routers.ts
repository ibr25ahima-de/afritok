import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
import { sdk } from "./_core/sdk";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { feedRouter } from "./routers-feed";
import { instantWithdrawalRouter } from "./routers-instant-withdrawal";
import { monetizationRouter } from "./routers-monetization";
import { liveRouter } from "./routers-live";
import { liveChatRouter } from "./live-chat";
import { directMessagesRouter } from "./routers-direct-messages";
import { likeRouter, commentRouter, favoriteRouter, shareRouter } from "./routers-interaction";
import { adminRouter } from "./routers-admin";
import { musicRouter } from "./routers-music";
import { adminMusicRouter } from "./routers-admin-music";
import { coinsRouter } from "./coins/coins-router";
import { giftRouter } from "./gifts/gift-router";
import { walletRouter } from "./wallet/wallet-router";
import { paymentRouter } from "./payments/payment-router";
import { platformFinanceRouter } from "./platform-finance-router";
import { advertisingRouter } from "./routers-advertising";
import { subscriptionRouter } from "./subscriptions/subscription-router";
import { recordWatchEarning } from "./micro-earnings";
import { getUserVideos, getVideoById, getFeedVideos, getFollowerCount, getFollowingCount, isFollowing, getUserEarnings, getUserWithdrawals, getDisplaySettings, updateDisplaySettings, db, createOTP, getValidOTP, deleteOTP, incrementOTPAttempts, getUserByPhone, upsertUser, createEarning, updateUserProfile, updateUserAvatar } from "./db";
import { storagePut } from "./storage";
import { videos, followers, users, reports, warnings } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const appRouter = router({
  system: systemRouter,
  feed: feedRouter,
  music: musicRouter,
  adminMusic: adminMusicRouter,
  coins: coinsRouter,
  gifts: giftRouter,
  wallet: walletRouter,
  payment: paymentRouter,
  platformFinance: platformFinanceRouter,
  advertising: advertisingRouter,
  subscription: subscriptionRouter,
  live: liveRouter,
  liveChat: liveChatRouter,
  directMessages: directMessagesRouter,
  instantWithdrawal: instantWithdrawalRouter,
  monetization: monetizationRouter,

  auth: router({
    me: publicProcedure.query(async (opts) => {
      const user = opts.ctx.user;
      if (user) {
        if (user.phone === "+225 05 64 19 41 33" && user.role !== "admin") {
          try {
            await db.update(users).set({ role: "admin" }).where(eq(users.id, user.id));
            user.role = "admin";
          } catch (error) {
            console.error("[Auth.me] Promotion failed:", error);
          }
        }
      }
      return user;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true };
    }),
    requestOtp: publicProcedure.input(z.object({ phone: z.string().min(10) })).mutation(async ({ input }) => {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      await createOTP(input.phone, code);
      console.log(`[OTP] ${input.phone}: ${code}`);
      return { success: true, code };
    }),
    verifyOtp: publicProcedure.input(z.object({ phone: z.string(), code: z.string() })).mutation(async ({ input, ctx }) => {
      const validOtp = await getValidOTP(input.phone, input.code);
      if (!validOtp) throw new TRPCError({ code: "UNAUTHORIZED" });
      let user = await getUserByPhone(input.phone);
      let isNewUser = false;
      if (!user) {
        isNewUser = true;
        await upsertUser({ phone: input.phone, name: "", loginMethod: "phone_otp", role: "user", lastSignedIn: new Date() });
        user = await getUserByPhone(input.phone);
      }
      await deleteOTP(validOtp.id);
      const token = await sdk.createSessionToken(user!.id, user!.phone);
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, cookieOptions);
      return { success: true, user, isNewUser };
    }),
  }),

  video: router({
    feed: publicProcedure.input(z.object({ limit: z.number().default(20), offset: z.number().default(0) })).query(async ({ input }) => {
      try {
        try {
          await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "musicUrl" text;`);
          await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "musicName" text;`);
          await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "thumbnailUrl" text;`);
        } catch (migrationError) {
          console.error("[Migration] Error adding columns:", migrationError);
        }
        return await getFeedVideos(input.limit, input.offset);
      } catch (error) {
        console.error("[video.feed] ERROR:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown feed error" });
      }
    }),
    upload: protectedProcedure.input(z.object({ title: z.string(), description: z.string().optional().nullable(), videoUrl: z.string(), thumbnailUrl: z.string().optional().nullable(), musicUrl: z.string().optional().nullable(), musicName: z.string().optional().nullable() })).mutation(async ({ ctx, input }) => {
      await db.insert(videos).values({ userId: ctx.user.id, title: input.title, description: input.description ?? null, videoUrl: input.videoUrl, thumbnailUrl: input.thumbnailUrl ?? null, musicUrl: input.musicUrl ?? null, musicName: input.musicName ?? null });
      return { success: true };
    }),
    uploadFile: protectedProcedure.input(z.object({ fileBuffer: z.instanceof(Uint8Array), fileName: z.string(), fileType: z.string() })).mutation(async ({ ctx, input }) => {
      try {
        const fileKey = `videos/${ctx.user.id}-${Date.now()}-${input.fileName}`;
        const { url: videoUrl } = await storagePut(fileKey, Buffer.from(input.fileBuffer), input.fileType);
        return { success: true, videoUrl };
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Upload failed" });
      }
    }),
    incrementViews: publicProcedure.input(z.object({ videoId: z.number() })).mutation(async ({ input, ctx }) => {
      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });
      await db.update(videos).set({ views: (video.views || 0) + 1 }).where(eq(videos.id, input.videoId));
      await recordWatchEarning(video.userId, input.videoId, 10);
      if (ctx.user?.id && ctx.user.id !== video.userId) await recordWatchEarning(ctx.user.id, input.videoId, 10);
      return { success: true };
    }),
    getByUser: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserVideos(input.userId)),
  }),

  like: likeRouter,
  comment: commentRouter,
  favorite: favoriteRouter,
  share: shareRouter,
  admin: adminRouter,

  follower: router({
    toggle: protectedProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      const following = await isFollowing(ctx.user.id, input.userId);
      if (following) {
        await db.delete(followers).where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId)));
        return { following: false };
      }
      await db.insert(followers).values({ followerId: ctx.user.id, followingId: input.userId });
      return { following: true };
    }),
    getCount: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => ({ followers: await getFollowerCount(input.userId), following: await getFollowingCount(input.userId) })),
    isFollowing: protectedProcedure.input(z.object({ userId: z.number() })).query(async ({ ctx, input }) => ({ following: await isFollowing(ctx.user.id, input.userId) })),
  }),

  earnings: router({
    getMyEarnings: protectedProcedure.query(({ ctx }) => getUserEarnings(ctx.user.id)),
    getMyWithdrawals: protectedProcedure.query(({ ctx }) => getUserWithdrawals(ctx.user.id)),
  }),

  user: router({
    getProfile: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => {
      const result = await db.select().from(users).where(eq(users.id, input.userId));
      return result[0] || null;
    }),
    getMyWarnings: protectedProcedure.query(async ({ ctx }) => {
      const myWarnings = await db.select({ id: warnings.id, reason: warnings.reason, message: warnings.message, createdAt: warnings.createdAt }).from(warnings).where(eq(warnings.userId, ctx.user.id)).orderBy(desc(warnings.createdAt));
      return myWarnings;
    }),
    getAll: publicProcedure.query(async () => db.select().from(users)),
    getVideos: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserVideos(input.userId)),
    updateProfile: protectedProcedure.input(z.object({ name: z.string(), bio: z.string().optional(), country: z.string().optional() })).mutation(async ({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
    uploadAvatar: protectedProcedure.input(z.object({ avatarUrl: z.string() })).mutation(async ({ ctx, input }) => updateUserAvatar(ctx.user.id, input.avatarUrl)),
    getDisplaySettings: protectedProcedure.query(async ({ ctx }) => getDisplaySettings(ctx.user.id)),
    updateDisplaySettings: protectedProcedure.input(z.object({ language: z.string(), darkMode: z.string(), dataSaver: z.boolean(), autoPlay: z.string(), textSize: z.string(), animations: z.boolean(), profilePublic: z.boolean().optional(), allowMessages: z.boolean().optional(), allowComments: z.boolean().optional(), showFollowers: z.boolean().optional(), showFollowing: z.boolean().optional() })).mutation(async ({ ctx, input }) => updateDisplaySettings(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
