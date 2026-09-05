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
import { applyPremiumVideoOptions } from "./subscriptions/premium-video-publishing";
import { recordWatchEarning } from "./micro-earnings";
import { getUserVideos, getVideoById, getFeedVideos, getFollowerCount, getFollowingCount, isFollowing, getUserEarnings, getUserWithdrawals, getDisplaySettings, updateDisplaySettings, db, createOTP, getValidOTP, deleteOTP, getUserByPhone, upsertUser, updateUserProfile, updateUserAvatar } from "./db";
import { storagePut, storageDeleteVideo } from "./storage";
import { videos, followers, users, warnings, comments, likes, favorites, shares } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const premiumVideoOptionsSchema = z.object({
  quality: z.enum(["standard", "hd"]).default("standard"),
  scheduledAt: z.string().datetime().nullable().optional(),
  commentsMode: z.enum(["all", "followers", "off"]).default("all"),
});

const settingsSchema = z.object({
  language: z.string().min(2).max(20),
  darkMode: z.enum(["Système", "Sombre", "Clair"]),
  dataSaver: z.boolean(),
  autoPlay: z.enum(["Wi-Fi uniquement", "Toujours", "Jamais"]),
  textSize: z.enum(["Petite", "Normale", "Grande"]),
  animations: z.boolean(),
  profilePublic: z.boolean().optional(),
  allowMessages: z.boolean().optional(),
  allowComments: z.boolean().optional(),
  showFollowers: z.boolean().optional(),
  showFollowing: z.boolean().optional(),
  twoFactorEnabled: z.boolean().optional(),
  loginAlerts: z.boolean().optional(),
  notifyFollowers: z.boolean().optional(),
  notifyLikes: z.boolean().optional(),
  notifyComments: z.boolean().optional(),
  notifyShares: z.boolean().optional(),
  notifyMessages: z.boolean().optional(),
  notifyPromotions: z.boolean().optional(),
});

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
    me: publicProcedure.query(({ ctx }) => ctx.user),
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
        return await getFeedVideos(input.limit, input.offset);
      } catch (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error instanceof Error ? error.message : "Unknown feed error" });
      }
    }),
    upload: protectedProcedure.input(z.object({ title: z.string(), description: z.string().optional().nullable(), videoUrl: z.string(), thumbnailUrl: z.string().optional().nullable(), musicUrl: z.string().optional().nullable(), musicName: z.string().optional().nullable(), premiumOptions: premiumVideoOptionsSchema.optional() })).mutation(async ({ ctx, input }) => {
      const [video] = await db.insert(videos).values({ userId: ctx.user.id, title: input.title, description: input.description ?? null, videoUrl: input.videoUrl, thumbnailUrl: input.thumbnailUrl ?? null, musicUrl: input.musicUrl ?? null, musicName: input.musicName ?? null }).returning({ id: videos.id });
      if (!video?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible d'enregistrer la vidéo." });
      if (input.premiumOptions) await applyPremiumVideoOptions(ctx.user.id, video.id, input.premiumOptions);
      return { success: true, videoId: video.id };
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
      await db.update(videos).set({ views: sql`COALESCE(${videos.views}, 0) + 1` }).where(eq(videos.id, input.videoId));
      await recordWatchEarning(video.userId, input.videoId, 10);
      if (ctx.user?.id && ctx.user.id !== video.userId) await recordWatchEarning(ctx.user.id, input.videoId, 10);
      return { success: true, views: (video.views || 0) + 1 };
    }),
    getByUser: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserVideos(input.userId)),
    delete: protectedProcedure.input(z.object({ videoId: z.number() })).mutation(async ({ ctx, input }) => {
      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Vidéo introuvable." });
      if (video.userId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne pouvez supprimer que vos propres vidéos." });
      try { await storageDeleteVideo(video.videoUrl); } catch (error) { console.error("[video.delete] Storage cleanup failed; deleting database record anyway:", error); }
      await db.delete(comments).where(eq(comments.videoId, input.videoId));
      await db.delete(likes).where(eq(likes.videoId, input.videoId));
      await db.delete(favorites).where(eq(favorites.videoId, input.videoId));
      await db.delete(shares).where(eq(shares.videoId, input.videoId));
      await db.delete(videos).where(eq(videos.id, input.videoId));
      return { success: true, videoId: input.videoId };
    }),
  }),
  like: likeRouter,
  comment: commentRouter,
  favorite: favoriteRouter,
  share: shareRouter,
  admin: adminRouter,
  follower: router({
    toggle: protectedProcedure.input(z.object({ userId: z.number() })).mutation(async ({ ctx, input }) => {
      if (ctx.user.id === input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas vous suivre vous-même." });
      const following = await isFollowing(ctx.user.id, input.userId);
      if (following) {
        await db.delete(followers).where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId)));
        return { following: false };
      }
      const [target] = await db.select({ id: users.id, profilePublic: users.profilePublic }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
      if (!target.profilePublic) throw new TRPCError({ code: "FORBIDDEN", message: "Ce profil est privé." });
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
    getProfile: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input, ctx }) => {
      const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
      if (!user) return null;
      if (!user.profilePublic && ctx.user?.id !== user.id && ctx.user?.role !== "admin") {
        return { id: user.id, name: user.name, avatarUrl: user.avatarUrl, country: user.country, profilePublic: false };
      }
      return user;
    }),
    getMyWarnings: protectedProcedure.query(async ({ ctx }) => db.select({ id: warnings.id, reason: warnings.reason, message: warnings.message, createdAt: warnings.createdAt }).from(warnings).where(eq(warnings.userId, ctx.user.id)).orderBy(desc(warnings.createdAt))),
    getAll: publicProcedure.query(async () => db.select().from(users)),
    getVideos: publicProcedure.input(z.object({ userId: z.number() })).query(async ({ input }) => getUserVideos(input.userId)),
    updateProfile: protectedProcedure.input(z.object({ name: z.string(), bio: z.string().optional(), country: z.string().optional() })).mutation(async ({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
    uploadAvatar: protectedProcedure.input(z.object({ avatarUrl: z.string() })).mutation(async ({ ctx, input }) => updateUserAvatar(ctx.user.id, input)),
    getDisplaySettings: protectedProcedure.query(async ({ ctx }) => getDisplaySettings(ctx.user.id)),
    updateDisplaySettings: protectedProcedure.input(settingsSchema).mutation(async ({ ctx, input }) => updateDisplaySettings(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;
