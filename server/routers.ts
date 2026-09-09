import { randomInt } from "node:crypto";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { SECURITY_LIMITS } from "./_core/security-constants";
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
import { adminMusicRouter } from "./admin-music";
import { coinsRouter } from "./coins/coins-router";
import { giftRouter } from "./gifts/gift-router";
import { walletRouter } from "./wallet/wallet-router";
import { paymentRouter } from "./payments/payment-router";
import { platformFinanceRouter } from "./platform-finance-router";
import { advertisingRouter } from "./routers-advertising";
import { subscriptionRouter } from "./subscriptions/subscription-router";
import { applyPremiumVideoOptions } from "./subscriptions/premium-video-publishing";
import { getUserVideos, getVideoById, getFeedVideos, getFollowerCount, getFollowingCount, isFollowing, getUserEarnings, getUserWithdrawals, getDisplaySettings, updateDisplaySettings, db, createOTP, getLatestOTP, consumeOTPAttempt, deleteOTP, getUserByPhone, upsertUser, updateUserProfile, updateUserAvatar } from "./db";
import { storagePut, storageDeleteVideo } from "./storage";
import { videos, followers, users, warnings, comments, likes, favorites, shares } from "../drizzle/schema";
import { eq, desc, and, sql } from "drizzle-orm";

const premiumVideoOptionsSchema = z.object({ quality: z.enum(["standard", "hd"]).default("standard"), scheduledAt: z.string().datetime().nullable().optional(), commentsMode: z.enum(["all", "followers", "off"]).default("all") });
const settingsSchema = z.object({ language: z.string().min(2).max(20), darkMode: z.enum(["Système", "Sombre", "Clair"]), dataSaver: z.boolean(), autoPlay: z.enum(["Wi-Fi uniquement", "Toujours", "Jamais"]), textSize: z.enum(["Petite", "Normale", "Grande"]), animations: z.boolean(), profilePublic: z.boolean().optional(), allowMessages: z.boolean().optional(), allowComments: z.boolean().optional(), showFollowers: z.boolean().optional(), showFollowing: z.boolean().optional(), twoFactorEnabled: z.boolean().optional(), loginAlerts: z.boolean().optional(), notifyFollowers: z.boolean().optional(), notifyLikes: z.boolean().optional(), notifyComments: z.boolean().optional(), notifyShares: z.boolean().optional(), notifyMessages: z.boolean().optional(), notifyPromotions: z.boolean().optional() });

const otpRequestWindow = new Map<string, number[]>();
const otpVerifyWindow = new Map<string, number[]>();
const OTP_REQUEST_LIMIT = 3;
const OTP_VERIFY_LIMIT = 10;
const OTP_WINDOW_MS = 10 * 60 * 1000;
const OTP_REQUEST_COOLDOWN_MS = 60 * 1000;

function allowOtpAttempt(store: Map<string, number[]>, key: string, limit: number, cooldownMs = 0) {
  const now = Date.now();
  const recent = (store.get(key) ?? []).filter((time) => now - time < OTP_WINDOW_MS);
  if (cooldownMs > 0 && recent.some((time) => now - time < cooldownMs)) return false;
  if (recent.length >= limit) return false;
  recent.push(now);
  store.set(key, recent);
  return true;
}

function toSafeAuthUser(user: typeof users.$inferSelect) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    avatarUrl: user.avatarUrl,
    country: user.country,
    currency: user.currency,
    profilePublic: user.profilePublic,
    allowMessages: user.allowMessages,
    allowComments: user.allowComments,
    showFollowers: user.showFollowers,
    showFollowing: user.showFollowing,
    language: user.language,
    darkMode: user.darkMode,
    dataSaver: user.dataSaver,
    autoPlay: user.autoPlay,
    textSize: user.textSize,
    animations: user.animations,
    twoFactorEnabled: user.twoFactorEnabled,
    loginAlerts: user.loginAlerts,
    notifyFollowers: user.notifyFollowers,
    notifyLikes: user.notifyLikes,
    notifyComments: user.notifyComments,
    notifyShares: user.notifyShares,
    notifyMessages: user.notifyMessages,
    notifyPromotions: user.notifyPromotions,
  };
}

export const appRouter = router({
  system: systemRouter, feed: feedRouter, music: musicRouter, adminMusic: adminMusicRouter, coins: coinsRouter, gifts: giftRouter, wallet: walletRouter, payment: paymentRouter, platformFinance: platformFinanceRouter, advertising: advertisingRouter, subscription: subscriptionRouter, live: liveRouter, liveChat: liveChatRouter, directMessages: directMessagesRouter, instantWithdrawal: instantWithdrawalRouter, monetization: monetizationRouter,
  auth: router({
    me: publicProcedure.query(({ ctx }) => ctx.user ? toSafeAuthUser(ctx.user) : null),
    logout: publicProcedure.mutation(({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); return { success: true }; }),
    requestOtp: publicProcedure.input(z.object({ phone: z.string().trim().min(10).max(25) })).mutation(async ({ input }) => {
      const phone = input.phone.replace(/\D/g, "");
      if (phone.length < 10 || phone.length > 20) throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid phone number" });
      if (!allowOtpAttempt(otpRequestWindow, phone, OTP_REQUEST_LIMIT, OTP_REQUEST_COOLDOWN_MS)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Veuillez patienter avant de demander un nouveau code." });
      const latest = await getLatestOTP(phone);
      if (latest && Date.now() - new Date(latest.createdAt).getTime() < SECURITY_LIMITS.otpWindowMs) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Veuillez patienter avant de demander un nouveau code." });
      const code = randomInt(100000, 1000000).toString();
      await createOTP(phone, code, SECURITY_LIMITS.otpExpiryMs / 60000);
      return process.env.NODE_ENV === "development" ? { success: true, phone, code } : { success: true, phone };
    }),
    verifyOtp: publicProcedure.input(z.object({ phone: z.string().trim().min(10).max(25), code: z.string().regex(/^\d{6}$/) })).mutation(async ({ input, ctx }) => {
      const phone = input.phone.replace(/\D/g, "");
      if (phone.length < 10 || phone.length > 20) throw new TRPCError({ code: "UNAUTHORIZED", message: "Code invalide ou expiré." });
      if (!allowOtpAttempt(otpVerifyWindow, phone, OTP_VERIFY_LIMIT)) throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de tentatives. Réessayez plus tard." });
      const otp = await getLatestOTP(phone);
      if (!otp || new Date(otp.expiresAt).getTime() <= Date.now()) throw new TRPCError({ code: "UNAUTHORIZED", message: "Code invalide ou expiré." });
      if (otp.attempts >= SECURITY_LIMITS.otpMaxAttempts) { await deleteOTP(otp.id); throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de tentatives." }); }
      const attempt = await consumeOTPAttempt(otp.id, SECURITY_LIMITS.otpMaxAttempts);
      if (!attempt) { await deleteOTP(otp.id); throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Trop de tentatives." }); }
      if (attempt.code !== input.code) { if (attempt.attempts >= SECURITY_LIMITS.otpMaxAttempts) await deleteOTP(otp.id); throw new TRPCError({ code: "UNAUTHORIZED", message: "Code invalide ou expiré." }); }
      let user = await getUserByPhone(phone);
      let isNewUser = false;
      if (!user) { isNewUser = true; await upsertUser({ phone, name: "", loginMethod: "phone_otp", role: "user", lastSignedIn: new Date() }); user = await getUserByPhone(phone); }
      if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible de créer la session." });
      await deleteOTP(otp.id);
      const token = await sdk.createSessionToken(user.id, user.phone, { expiresInMs: SECURITY_LIMITS.sessionMaxAgeSeconds * 1000 });
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SECURITY_LIMITS.sessionMaxAgeSeconds * 1000 });
      return { success: true, user: toSafeAuthUser(user), isNewUser };
    }),
  }),
  video: router({
    feed: publicProcedure.input(z.object({ limit: z.number().int().min(1).max(50).default(20), offset: z.number().int().min(0).max(100000).default(0) })).query(async ({ input }) => getFeedVideos(input.limit, input.offset)),
    upload: protectedProcedure.input(z.object({ title: z.string().trim().min(1).max(200), description: z.string().trim().max(5000).optional().nullable(), videoUrl: z.string().url().max(2048), thumbnailUrl: z.string().url().max(2048).optional().nullable(), musicUrl: z.string().url().max(2048).optional().nullable(), musicName: z.string().trim().max(200).optional().nullable(), premiumOptions: premiumVideoOptionsSchema.optional() })).mutation(async ({ ctx, input }) => { const [video] = await db.insert(videos).values({ userId: ctx.user.id, title: input.title, description: input.description ?? null, videoUrl: input.videoUrl, thumbnailUrl: input.thumbnailUrl ?? null, musicUrl: input.musicUrl ?? null, musicName: input.musicName ?? null }).returning({ id: videos.id }); if (!video?.id) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Impossible d'enregistrer la vidéo." }); if (input.premiumOptions) await applyPremiumVideoOptions(ctx.user.id, video.id, input.premiumOptions); return { success: true, videoId: video.id }; }),
    uploadFile: protectedProcedure.input(z.object({ fileBuffer: z.instanceof(Uint8Array), fileName: z.string().trim().min(1).max(255), fileType: z.string().trim().min(1).max(100) })).mutation(async ({ ctx, input }) => { try { const fileKey = `videos/${ctx.user.id}-${Date.now()}-${input.fileName}`; const { url: videoUrl } = await storagePut(fileKey, Buffer.from(input.fileBuffer), input.fileType); return { success: true, videoUrl }; } catch (error) { console.error("[video.uploadFile] upload failed", error); throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Upload failed" }); } }),
    incrementViews: protectedProcedure.input(z.object({ videoId: z.number().int().positive() })).mutation(async ({ input }) => { const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" }); await db.update(videos).set({ views: sql`COALESCE(${videos.views}, 0) + 1` }).where(eq(videos.id, input.videoId)); return { success: true, views: (video.views || 0) + 1 }; }),
    getByUser: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input, ctx }) => { const [owner] = await db.select({ id: users.id, profilePublic: users.profilePublic }).from(users).where(eq(users.id, input.userId)).limit(1); if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." }); if (!owner.profilePublic && ctx.user?.id !== owner.id && ctx.user?.role !== "admin") return []; return getUserVideos(input.userId); }),
    delete: protectedProcedure.input(z.object({ videoId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Vidéo introuvable." }); if (video.userId !== ctx.user.id && ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Vous ne pouvez supprimer que vos propres vidéos." }); try { await storageDeleteVideo(video.videoUrl); } catch (error) { console.error("[video.delete] Storage cleanup failed; deleting database record anyway:", error); } await db.delete(comments).where(eq(comments.videoId, input.videoId)); await db.delete(likes).where(eq(likes.videoId, input.videoId)); await db.delete(favorites).where(eq(favorites.videoId, input.videoId)); await db.delete(shares).where(eq(shares.videoId, input.videoId)); await db.delete(videos).where(eq(videos.id, input.videoId)); return { success: true, videoId: input.videoId }; }),
  }),
  like: likeRouter, comment: commentRouter, favorite: favoriteRouter, share: shareRouter, admin: adminRouter,
  follower: router({ toggle: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).mutation(async ({ ctx, input }) => { if (ctx.user.id === input.userId) throw new TRPCError({ code: "BAD_REQUEST", message: "Vous ne pouvez pas vous suivre vous-même." }); const following = await isFollowing(ctx.user.id, input.userId); if (following) { await db.delete(followers).where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId))); return { following: false }; } const [target] = await db.select({ id: users.id, profilePublic: users.profilePublic }).from(users).where(eq(users.id, input.userId)).limit(1); if (!target) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." }); if (!target.profilePublic) throw new TRPCError({ code: "FORBIDDEN", message: "Ce profil est privé." }); await db.insert(followers).values({ followerId: ctx.user.id, followingId: input.userId }); return { following: true }; }), getCount: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input }) => ({ followers: await getFollowerCount(input.userId), following: await getFollowingCount(input.userId) })), isFollowing: protectedProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ ctx, input }) => ({ following: await isFollowing(ctx.user.id, input.userId) })) }),
  earnings: router({ getMyEarnings: protectedProcedure.query(({ ctx }) => getUserEarnings(ctx.user.id)), getMyWithdrawals: protectedProcedure.query(({ ctx }) => getUserWithdrawals(ctx.user.id)) }),
  user: router({
    getProfile: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input, ctx }) => { const [user] = await db.select().from(users).where(eq(users.id, input.userId)).limit(1); if (!user) return null; if (!user.profilePublic && ctx.user?.id !== user.id && ctx.user?.role !== "admin") return { id: user.id, name: user.name, avatarUrl: user.avatarUrl, country: user.country, profilePublic: false }; if (ctx.user?.id !== user.id && ctx.user?.role !== "admin") return { id: user.id, name: user.name, avatarUrl: user.avatarUrl, country: user.country, bio: user.bio, profilePublic: user.profilePublic, createdAt: user.createdAt }; return user; }),
    getMyWarnings: protectedProcedure.query(async ({ ctx }) => db.select({ id: warnings.id, reason: warnings.reason, message: warnings.message, createdAt: warnings.createdAt }).from(warnings).where(eq(warnings.userId, ctx.user.id)).orderBy(desc(warnings.createdAt))),
    getAll: publicProcedure.query(async () => db.select({ id: users.id, name: users.name, avatarUrl: users.avatarUrl, country: users.country, profilePublic: users.profilePublic }).from(users).where(eq(users.profilePublic, true)).orderBy(users.id).limit(500)),
    getVideos: publicProcedure.input(z.object({ userId: z.number().int().positive() })).query(async ({ input, ctx }) => { const [owner] = await db.select({ id: users.id, profilePublic: users.profilePublic }).from(users).where(eq(users.id, input.userId)).limit(1); if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." }); if (!owner.profilePublic && ctx.user?.id !== owner.id && ctx.user?.role !== "admin") return []; return getUserVideos(input.userId); }),
    updateProfile: protectedProcedure.input(z.object({ name: z.string().trim().min(1).max(100), bio: z.string().trim().max(1000).optional(), country: z.string().trim().max(100).optional() })).mutation(async ({ ctx, input }) => updateUserProfile(ctx.user.id, input)),
    uploadAvatar: protectedProcedure.input(z.object({ avatarUrl: z.string().url().max(2048) })).mutation(async ({ ctx, input }) => updateUserAvatar(ctx.user.id, input)),
    getDisplaySettings: protectedProcedure.query(async ({ ctx }) => getDisplaySettings(ctx.user.id)),
    updateDisplaySettings: protectedProcedure.input(settingsSchema).mutation(async ({ ctx, input }) => updateDisplaySettings(ctx.user.id, input)),
  }),
});

export type AppRouter = typeof appRouter;