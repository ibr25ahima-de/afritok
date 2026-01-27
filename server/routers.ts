import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router, protectedProcedure } from "./_core/trpc";
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
  getDb,
} from "./db";
import { videos, likes, comments, followers, earnings, withdrawals, users, notifications, blocks, reports } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";
import { uploadVideoToStorage } from "./videoUpload";
import { createDonationIntent, createPaymentSession } from "./stripe";
import { liveRouter } from "./routers-live";
import { liveChatRouter } from "./routers-live-chat";

export const appRouter = router({
  system: systemRouter,
  live: liveRouter,
  liveChat: liveChatRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // Video routes
  video: router({
    feed: publicProcedure
      .input(z.object({ limit: z.number().default(20), offset: z.number().default(0) }))
      .query(({ input }) => getFeedVideos(input.limit, input.offset)),
    
    getById: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getVideoById(input.id)),
    
    getUserVideos: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ input }) => getUserVideos(input.userId)),
    
    upload: protectedProcedure
      .input(z.object({
        title: z.string().optional(),
        description: z.string().optional(),
        videoUrl: z.string(),
        thumbnailUrl: z.string().optional(),
        duration: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await db.insert(videos).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          videoUrl: input.videoUrl,
          thumbnailUrl: input.thumbnailUrl,
          duration: input.duration,
        });
        
        return { success: true };
      }),
    
    updateViews: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const video = await getVideoById(input.videoId);
        if (!video) throw new TRPCError({ code: "NOT_FOUND" });
        
        return { success: true };
      }),
  }),

  // Like routes
  like: router({
    toggle: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const existingLike = await getUserLike(ctx.user.id, input.videoId);
        
        if (existingLike) {
          await db.delete(likes).where(and(eq(likes.userId, ctx.user.id), eq(likes.videoId, input.videoId)));
          return { liked: false };
        } else {
          await db.insert(likes).values({
            userId: ctx.user.id,
            videoId: input.videoId,
          });
          return { liked: true };
        }
      }),
    
    isLiked: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .query(({ ctx, input }) => getUserLike(ctx.user.id, input.videoId)),
  }),

  // Comment routes
  comment: router({
    list: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .query(({ input }) => getVideoComments(input.videoId)),
    
    create: protectedProcedure
      .input(z.object({ videoId: z.number(), text: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await db.insert(comments).values({
          userId: ctx.user.id,
          videoId: input.videoId,
          text: input.text,
        });
        
        return { success: true };
      }),
    
    delete: protectedProcedure
      .input(z.object({ commentId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        return { success: true };
      }),
  }),

  // Follower routes
  follower: router({
    toggle: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const isCurrentlyFollowing = await isFollowing(ctx.user.id, input.userId);
        
        if (isCurrentlyFollowing) {
          await db.delete(followers).where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId)));
          return { following: false };
        } else {
          await db.insert(followers).values({
            followerId: ctx.user.id,
            followingId: input.userId,
          });
          return { following: true };
        }
      }),
    
    count: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => ({
        followers: await getFollowerCount(input.userId),
        following: await getFollowingCount(input.userId),
      })),
    
    isFollowing: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(({ ctx, input }) => isFollowing(ctx.user.id, input.userId)),
  }),

  // Search routes
  search: router({
    videos: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(videos).where(eq(videos.isPublic, true)).limit(input.limit);
      }),
    
    creators: publicProcedure
      .input(z.object({ query: z.string(), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(users).limit(input.limit);
      }),
  }),

  // Trending routes
  trending: router({
    videos: publicProcedure
      .input(z.object({ limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(videos).where(eq(videos.isPublic, true)).orderBy((v) => v.likes).limit(input.limit);
      }),
    
    hashtags: publicProcedure
      .query(async () => {
        return [
          { tag: "AfricanCreators", count: 1500 },
          { tag: "AfritokChallenge", count: 1200 },
          { tag: "AfricanTalent", count: 980 },
          { tag: "MadeInAfrica", count: 850 },
          { tag: "AfricanMusic", count: 720 },
        ];
      }),
  }),

  // Notification routes
  notification: router({
    list: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) return [];
        return db.select().from(notifications).where(eq(notifications.userId, ctx.user.id)).orderBy((n) => n.createdAt);
      }),
    
    markAsRead: protectedProcedure
      .input(z.object({ notificationId: z.number() }))
      .mutation(async ({ input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        return { success: true };
      }),
  }),

  // Block routes
  block: router({
    toggle: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const existingBlock = await db.select().from(blocks).where(and(eq(blocks.userId, ctx.user.id), eq(blocks.blockedUserId, input.userId))).limit(1);
        
        if (existingBlock.length > 0) {
          await db.delete(blocks).where(and(eq(blocks.userId, ctx.user.id), eq(blocks.blockedUserId, input.userId)));
          return { blocked: false };
        } else {
          await db.insert(blocks).values({
            userId: ctx.user.id,
            blockedUserId: input.userId,
          });
          return { blocked: true };
        }
      }),
    
    isBlocked: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) return false;
        const block = await db.select().from(blocks).where(and(eq(blocks.userId, ctx.user.id), eq(blocks.blockedUserId, input.userId))).limit(1);
        return block.length > 0;
      }),
  }),

  // Video upload routes
  videoUpload: router({
    upload: protectedProcedure
      .input(z.object({
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
        file: z.instanceof(File),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

        try {
          const { videoUrl, thumbnailUrl, size } = await uploadVideoToStorage(
            input.file,
            ctx.user.id
          );

          let duration = 0;
          try {
            const video = document.createElement("video");
            const objectUrl = URL.createObjectURL(input.file);
            video.src = objectUrl;
            duration = Math.round(video.duration) || 0;
          } catch (e) {
            console.warn("Could not extract video duration");
          }

          await db.insert(videos).values({
            userId: ctx.user.id,
            title: input.title,
            description: input.description,
            videoUrl,
            thumbnailUrl,
            duration,
            views: 0,
            likes: 0,
            comments: 0,
            shares: 0,
            isPublic: true,
          });

          return { success: true, videoUrl, thumbnailUrl };
        } catch (error) {
          console.error("Video upload error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Upload failed",
          });
        }
      }),
  }),

  // Report routes
  report: router({
    create: protectedProcedure
      .input(z.object({
        videoId: z.number().optional(),
        userId: z.number().optional(),
        reason: z.string(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await db.insert(reports).values({
          reporterId: ctx.user.id,
          videoId: input.videoId,
          userId: input.userId,
          reason: input.reason,
          description: input.description,
        });
        
        return { success: true };
      }),
  }),

  // Monetization routes
  monetization: router({
    earnings: protectedProcedure
      .query(({ ctx }) => getUserEarnings(ctx.user.id)),
    
    withdrawals: protectedProcedure
      .query(({ ctx }) => getUserWithdrawals(ctx.user.id)),
    
    stats: protectedProcedure
      .query(async ({ ctx }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        const user = await db.select().from(users).where(eq(users.id, ctx.user.id)).limit(1);
        return user.length > 0 ? { totalEarnings: user[0].totalEarnings, totalWithdrawals: user[0].totalWithdrawals } : null;
      }),
    
    requestWithdrawal: protectedProcedure
      .input(z.object({
        amount: z.string(),
        paymentMethod: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        
        await db.insert(withdrawals).values({
          userId: ctx.user.id,
          amount: input.amount,
          paymentMethod: input.paymentMethod,
        });
        
        return { success: true };
      }),
  }),

  // Payment routes
  payment: router({
    createDonation: protectedProcedure
      .input(z.object({
        amount: z.number().min(1),
        currency: z.string().default("USD"),
        creatorId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const paymentIntent = await createDonationIntent(
            input.amount,
            input.currency,
            input.creatorId,
            ctx.user.email || "unknown@example.com"
          );

          return {
            success: true,
            clientSecret: paymentIntent.client_secret,
            amount: paymentIntent.amount,
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Payment failed",
          });
        }
      }),

    createCheckoutSession: protectedProcedure
      .input(z.object({
        amount: z.number().min(1),
        currency: z.string().default("USD"),
        description: z.string(),
        successUrl: z.string(),
        cancelUrl: z.string(),
      }))
      .mutation(async ({ ctx, input }) => {
        try {
          const session = await createPaymentSession(
            {
              amount: input.amount,
              currency: input.currency,
              description: input.description,
              metadata: {
                userId: ctx.user.id.toString(),
              },
            },
            input.successUrl,
            input.cancelUrl
          );

          return {
            success: true,
            sessionId: session.id,
            url: session.url,
          };
        } catch (error) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error instanceof Error ? error.message : "Checkout failed",
          });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
