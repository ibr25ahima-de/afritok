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
  createOTP,
  getValidOTP,
  deleteOTP,
  incrementOTPAttempts,
  getUserByPhone,
  upsertUser,
} from "./db";
import { videos, likes, comments, followers, earnings, withdrawals, users, notifications, blocks, reports } from "../drizzle/schema";
import { eq, and, like } from "drizzle-orm";
import { uploadVideoToStorage } from "./videoUpload";
import { createDonationIntent, createPaymentSession } from "./stripe";
import { liveRouter } from "./routers-live";
import { liveChatRouter } from "./routers-live-chat";
import { createJWT, setSessionCookie } from "./_core/sdk";

export const appRouter = router({
  system: systemRouter,
  live: liveRouter,
  liveChat: liveChatRouter,

  // ============================================
  // AUTHENTICATION ROUTES
  // ============================================
  auth: router({
    // Get current user
    me: publicProcedure.query((opts) => opts.ctx.user),

    // Logout - clear session cookie
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),

    // Request OTP - Send code to phone
    requestOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10) }))
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database unavailable",
            });
          }

          // Generate 6-digit OTP code
          const code = Math.floor(100000 + Math.random() * 900000).toString();

          // Create OTP in database (expires in 10 minutes)
          await createOTP(input.phone, code);

          // In production, send SMS here
          // For now, we'll just log it
          console.log(`[OTP] Code for ${input.phone}: ${code}`);

          return {
            success: true,
            code, // Return code for development/testing
            message: "OTP sent successfully",
          };
        } catch (error: any) {
          console.error("[Auth] Request OTP error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Failed to request OTP",
          });
        }
      }),

    // Verify OTP - Validate code and create session
    verifyOtp: publicProcedure
      .input(z.object({ phone: z.string().min(10), code: z.string().length(6) }))
      .mutation(async ({ input, ctx }) => {
        try {
          const db = await getDb();
          if (!db) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Database unavailable",
            });
          }

          // Get valid OTP from database
          const validOtp = await getValidOTP(input.phone, input.code);

          if (!validOtp) {
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid or expired OTP",
            });
          }

          // Check if OTP attempts exceeded
          if (validOtp.attempts >= 5) {
            await deleteOTP(validOtp.id);
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Too many failed attempts. Please request a new OTP.",
            });
          }

          // If code doesn't match, increment attempts
          if (validOtp.code !== input.code) {
            await incrementOTPAttempts(validOtp.id);
            throw new TRPCError({
              code: "UNAUTHORIZED",
              message: "Invalid OTP code",
            });
          }

          // OTP is valid - get or create user
          let user = await getUserByPhone(input.phone);

          if (!user) {
            // Create new user
            await upsertUser({
              phone: input.phone,
              name: `User ${input.phone.slice(-4)}`,
              email: null,
              loginMethod: "phone_otp",
              role: "user",
              lastSignedIn: new Date(),
            });

            // Fetch the newly created user
            user = await getUserByPhone(input.phone);
          } else {
            // Update last signed in
            await upsertUser({
              phone: input.phone,
              lastSignedIn: new Date(),
            });
          }

          if (!user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create/retrieve user",
            });
          }

          // Delete used OTP
          await deleteOTP(validOtp.id);

          // Create JWT token
          const token = createJWT({ userId: user.id, phone: user.phone });

          // Set session cookie
          const cookieOptions = getSessionCookieOptions(ctx.req);
          setSessionCookie(ctx.res, token, cookieOptions);

          return {
            success: true,
            user: {
              id: user.id,
              phone: user.phone,
              name: user.name,
              email: user.email,
              role: user.role,
            },
            message: "Login successful",
          };
        } catch (error: any) {
          if (error instanceof TRPCError) throw error;

          console.error("[Auth] Verify OTP error:", error);
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: error?.message || "Failed to verify OTP",
          });
        }
      }),
  }),

  // ============================================
  // VIDEO ROUTES
  // ============================================
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
      .input(
        z.object({
          title: z.string(),
          description: z.string().optional(),
          videoFile: z.instanceof(File),
          thumbnailFile: z.instanceof(File).optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const { videoUrl, thumbnailUrl, duration } = await uploadVideoToStorage(input.videoFile, input.thumbnailFile);

          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Database unavailable" });

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
        } catch (error) {
          console.error("[Video] Upload failed:", error);
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to upload video" });
        }
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const video = await getVideoById(input.id);
          if (!video || video.userId !== ctx.user.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete this video" });
          }

          await db.delete(videos).where(eq(videos.id, input.id));
          return { success: true };
        } catch (error) {
          if (error instanceof TRPCError) throw error;
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),
  }),

  // ============================================
  // LIKE ROUTES
  // ============================================
  like: router({
    toggle: protectedProcedure
      .input(z.object({ videoId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const existingLike = await getUserLike(ctx.user.id, input.videoId);

          if (existingLike) {
            await db.delete(likes).where(eq(likes.id, existingLike.id));
            return { liked: false };
          } else {
            await db.insert(likes).values({
              userId: ctx.user.id,
              videoId: input.videoId,
            });
            return { liked: true };
          }
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),

    isLiked: publicProcedure
      .input(z.object({ videoId: z.number(), userId: z.number() }))
      .query(({ input }) => getUserLike(input.userId, input.videoId).then((like) => !!like)),
  }),

  // ============================================
  // COMMENT ROUTES
  // ============================================
  comment: router({
    getByVideo: publicProcedure
      .input(z.object({ videoId: z.number() }))
      .query(({ input }) => getVideoComments(input.videoId)),

    create: protectedProcedure
      .input(z.object({ videoId: z.number(), text: z.string().min(1).max(500) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const result = await db.insert(comments).values({
            userId: ctx.user.id,
            videoId: input.videoId,
            text: input.text,
          });

          return { success: true, commentId: result.insertId };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),
  }),

  // ============================================
  // FOLLOWER ROUTES
  // ============================================
  follower: router({
    toggle: protectedProcedure
      .input(z.object({ userId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          const isFollowingNow = await isFollowing(ctx.user.id, input.userId);

          if (isFollowingNow) {
            await db
              .delete(followers)
              .where(and(eq(followers.followerId, ctx.user.id), eq(followers.followingId, input.userId)));
            return { following: false };
          } else {
            await db.insert(followers).values({
              followerId: ctx.user.id,
              followingId: input.userId,
            });
            return { following: true };
          }
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),

    getCount: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => ({
        followers: await getFollowerCount(input.userId),
        following: await getFollowingCount(input.userId),
      })),
  }),

  // ============================================
  // EARNINGS ROUTES
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
  // MONETIZATION ROUTES (Stripe, Paystack, Wave, etc.)
  // ============================================
  monetization: router({
    createDonation: protectedProcedure
      .input(z.object({ videoId: z.number(), amount: z.number().min(1) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const intent = await createDonationIntent(input.amount, input.videoId, ctx.user.id);
          return intent;
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create donation" });
        }
      }),

    createPaymentSession: protectedProcedure
      .input(z.object({ amount: z.number().min(1), description: z.string() }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const session = await createPaymentSession(input.amount, input.description, ctx.user.id);
          return session;
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create payment session" });
        }
      }),
  }),

  // ============================================
  // USER PROFILE ROUTES
  // ============================================
  user: router({
    getProfile: publicProcedure
      .input(z.object({ userId: z.number() }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return null;

        const result = await db.select().from(users).where(eq(users.id, input.userId)).limit(1);
        return result.length > 0 ? result[0] : null;
      }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          bio: z.string().optional(),
          avatarUrl: z.string().optional(),
          country: z.string().optional(),
          currency: z.string().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          await db
            .update(users)
            .set({
              ...input,
              updatedAt: new Date(),
            })
            .where(eq(users.id, ctx.user.id));

          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),
  }),

  // ============================================
  // SEARCH ROUTES
  // ============================================
  search: router({
    videos: publicProcedure
      .input(z.object({ query: z.string().min(1), limit: z.number().default(20) }))
      .query(async ({ input }) => {
        const db = await getDb();
        if (!db) return [];

        return db
          .select()
          .from(videos)
          .where(and(eq(videos.isPublic, true), like(videos.title, `%${input.query}%`)))
          .limit(input.limit);
      }),
  }),

  // ============================================
  // ADMIN ROUTES
  // ============================================
  admin: router({
    getReports: protectedProcedure.query(async ({ ctx }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const db = await getDb();
      if (!db) return [];

      return db.select().from(reports).orderBy((r) => r.createdAt);
    }),

    resolveReport: protectedProcedure
      .input(z.object({ reportId: z.number(), status: z.enum(["resolved", "rejected"]) }))
      .mutation(async ({ ctx, input }) => {
        if (!ctx.user || ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN" });
        }

        try {
          const db = await getDb();
          if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

          await db.update(reports).set({ status: input.status }).where(eq(reports.id, input.reportId));

          return { success: true };
        } catch (error) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
