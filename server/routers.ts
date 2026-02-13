import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

// ✅ FIXED: Use relative imports instead of aliases
import { db } from "./db";
import { videos } from "../drizzle/schema";
import { storagePut } from "./storage";
import { createOTP, getValidOTP } from "./db";

// ✅ Video Upload Router
export const videoUploadRouter = router({
  upload: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        file: z.any(), // ✅ FIXED: Changed from videoFile to file
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        // ✅ Validate file
        if (!input.file || !(input.file instanceof File)) {
          throw new Error("Invalid file");
        }

        // ✅ Convert File to Buffer
        const buffer = await input.file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // ✅ Upload to S3
        const fileKey = `videos/${ctx.user.id}/${Date.now()}-${input.file.name}`;
        const { url: videoUrl } = await storagePut(
          fileKey,
          uint8Array,
          input.file.type || "video/mp4"
        );

        // ✅ Insert video record
        const result = await db.insert(videos).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description || "",
          videoUrl,
          thumbnailUrl: "", // Optional for now
          duration: 0, // Optional for now
          isPublic: true,
        });

        return { 
          success: true, 
          videoId: result.insertId,
          videoUrl 
        };
      } catch (error) {
        console.error("[Video] Upload failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload video",
        });
      }
    }),
});

// ✅ Auth Router
export const authRouter = router({
  requestOtp: publicProcedure
    .input(z.object({ phone: z.string().min(10) }))
    .mutation(async ({ input }) => {
      try {
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        await createOTP(input.phone, code, 10);
        console.log(`[Auth] OTP generated for ${input.phone}: ${code}`);
        
        return {
          success: true,
          code, // Return code for development/testing
          message: "OTP sent successfully",
        };
      } catch (error) {
        console.error("[Auth] OTP request failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP",
        });
      }
    }),

  verifyOtp: publicProcedure
    .input(z.object({ phone: z.string(), code: z.string() }))
    .mutation(async ({ ctx, input }) => {
      try {
        const validOtp = await getValidOTP(input.phone, input.code);
        if (!validOtp) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid or expired OTP",
          });
        }

        // ✅ Create or update user
        await db.execute(
          `INSERT INTO users (phone, name, email, loginMethod, role, bio, avatarUrl, country, currency, totalEarnings, totalWithdrawals, lastSignedIn) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) 
           ON CONFLICT (phone) DO UPDATE SET lastSignedIn = EXCLUDED.lastSignedIn, updatedAt = NOW()`
          , [input.phone, '', '', 'phone', 'user', '', '', '', '', 0, 0]
        );

        const user = await db.query(
          `SELECT * FROM users WHERE phone = $1`,
          [input.phone]
        );

        if (!user.rows || user.rows.length === 0) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create user",
          });
        }

        // ✅ Create session
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, user.rows[0].id, cookieOptions);

        return {
          success: true,
          user: user.rows[0],
        };
      } catch (error) {
        console.error("[Auth] OTP verification failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to verify OTP",
        });
      }
    }),

  me: publicProcedure.query(opts => opts.ctx.user),

  logout: publicProcedure.mutation(({ ctx }) => {
    const cookieOptions = getSessionCookieOptions(ctx.req);
    ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
    return {
      success: true,
    } as const;
  }),
});

// ✅ Main App Router
export const appRouter = router({
  system: systemRouter,
  auth: authRouter,
  videoUpload: videoUploadRouter,
});

export type AppRouter = typeof appRouter;
