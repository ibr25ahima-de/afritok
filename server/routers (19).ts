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
import { liveChatRouter } from "./routers-live-chat";
import { likeRouter, commentRouter, favoriteRouter, shareRouter } from "./routers-interaction";
import { adminRouter } from "./routers-admin";
import { musicRouter } from "./routers-music";
import { adminMusicRouter } from "./routers-admin-music";

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
  updateUserProfile,
  updateUserAvatar,
} from "./db";

import { storagePut } from "./storage";

import {
  videos,
  followers,
  users,
  reports,
} from "../drizzle/schema";

import { eq, and } from "drizzle-orm";

// ============================================
// MAIN ROUTER
// ============================================

export const appRouter = router({
  system: systemRouter,
  feed: feedRouter,
  music: musicRouter,
  adminMusic: adminMusicRouter,
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
        let isNewUser = false;

        if (!user) {
          isNewUser = true;

          await upsertUser({
            phone: input.phone,
            name: "",
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

        return {
          success: true,
          user,
          isNewUser,
        };
      }),
  }),

  // ============================================
  // VIDEO
  // ============================================

  video: router({
    feed: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(async ({ input }) => {
        try {
          console.log("🔥 [video.feed] CALLED", input);

          const data = await getFeedVideos(input.limit, input.offset);

          console.log("✅ [video.feed] SUCCESS");

          return data;

        } catch (error) {
          console.error("❌ [video.feed] ERROR:", error);

          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message:
              error instanceof Error ? error.message : "Unknown feed error",
          });
        }
      }),

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
    uploadFile: protectedProcedure
      .input(z.object({
        fileBuffer: z.instanceof(Uint8Array),
        fileName: z.string(),
        fileType: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          console.log(`[Upload] Starting upload for user ${ctx.user.id}`);
          console.log(`[Upload] File: ${input.fileName}, Type: ${input.fileType}`);

          const fileKey = `videos/${ctx.user.id}-${Date.now()}-${input.fileName}`;
          console.log(`[Upload] File key: ${fileKey}`);

          const { url: videoUrl } = await storagePut(
            fileKey,
            Buffer.from(input.fileBuffer),
            input.fileType
          );

          console.log(`[Upload] Storage upload successful, URL: ${videoUrl}`);

          await db.insert(videos).values({
            userId: ctx.user.id,
            title: input.fileName,
            description: null,
            videoUrl: videoUrl,
          });

          console.log(`[Upload] Video record created in database`);

          return { success: true, videoUrl };
        } catch (error) {
          console.error(`[Upload] Error:`, error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }),
          
    incrementViews: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const video = await getVideoById(input.videoId);
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });

        console.log("👀 VIEW TRIGGERED", {
          videoId: input.videoId,
          userId: ctx.user?.id,
          ownerId: video.userId,
        });

        // 1. incrémenter les vues
        await db
          .update(videos)
          .set({ views: (video.views || 0) + 1 })
          .where(eq(videos.id, input.videoId));

        const isDebug = process.env.DEBUG_EARNINGS === "true";

        // 2. 💰 payer le créateur
        await createEarning(video.userId, 1, "creator_view", input.videoId);

        // 3. 💰 payer le viewer
        if (ctx.user?.id) {
          if (isDebug) {
            // mode test → autorise même si c’est ta propre vidéo
            await createEarning(ctx.user.id, 0.5, "view", input.videoId);
          } else {
            // mode normal → bloque auto-view
            if (ctx.user.id !== video.userId) {
              await createEarning(ctx.user.id, 0.5, "view", input.videoId);
            }
          }
        }

        return { success: true };
      }),

    getByUser: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => await getUserVideos(input.userId)),
  }),

  // ============================================
  // INTERACTIONS
  // ============================================

  like: likeRouter,
  comment: commentRouter,
  favorite: favoriteRouter,
  share: shareRouter,
  admin: adminRouter,

  // ============================================
  // FOLLOW
  // ============================================

  follower: router({
  toggle: protectedProcedure
    .input(z.object({ userId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const following = await isFollowing(
        ctx.user.id,
        input.userId
      );

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

  isFollowing: protectedProcedure
    .input(
      z.object({
        userId: z.number(),
      })
    )
    .query(async ({ ctx, input }) => {
      if (!ctx.user) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      return {
        following: await isFollowing(
          ctx.user.id,
          input.userId
        ),
      };
    }),
}),

  // ============================================
  // EARNINGS
  // ============================================

  earnings: router({
    getMyEarnings: protectedProcedure.query(({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
      return getUserEarnings(ctx.user.id);
    }),

    getMyWithdrawals: protectedProcedure.query(({ ctx }) => {
      if (!ctx.user) {
        throw new TRPCError({ code: "UNAUTHORIZED" });
      }
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

    getAll: publicProcedure.query(async () => {
      return await db.select().from(users);
    }),

    getVideos: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => await getUserVideos(input.userId)),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string(),
          bio: z.string().optional(),
          country: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) {
          throw new TRPCError({
            code: "UNAUTHORIZED",
          });
        }

        return await updateUserProfile(
          ctx.user.id,
          input
        );
      }),

    uploadAvatar: protectedProcedure
      .input(
        z.object({
          avatarUrl: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        return await updateUserAvatar(
          ctx.user.id,
          input.avatarUrl
        );
      }),
  }),

  // ============================================
  // ADMIN (OLD - DEPRECATED BY adminRouter)
  // ============================================

  // Note: This section is kept for reference but admin functionality 
  // is now handled by adminRouter imported above.
  /*
  admin: router({
    getReports: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return db.select().from(reports);
    }),
  }),
  */
});

export type AppRouter = typeof appRouter;
