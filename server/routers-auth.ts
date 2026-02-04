import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createOTP,
  getValidOTP,
  deleteOTP,
  incrementOTPAttempts,
  getUserByPhone,
  upsertUser,
} from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";

/**
 * Phone OTP Authentication Router
 * Handles phone number verification and OTP-based login flow
 */
export const authRouter = router({
  /**
   * Request OTP - Send a 6-digit code to the user's phone
   * Step 1 of the login flow
   */
  requestOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(10, "Phone number too short").max(20, "Phone number too long"),
      })
    )
    .mutation(async ({ input }) => {
      try {
        // Clean phone number (remove all non-digits)
        const phone = input.phone.replace(/\D/g, "");

        if (phone.length < 10) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid phone number format",
          });
        }

        // Generate random 6-digit OTP
        const code = Math.floor(100000 + Math.random() * 900000).toString();

        // Store OTP in database (expires in 10 minutes)
        await createOTP(phone, code, 10);

        // Log for development (in production, send via SMS)
        console.log(`[Auth] OTP for ${phone}: ${code}`);

        return {
          success: true,
          message: "OTP sent successfully",
          // In development, return the code for testing
          // In production, remove this and send via SMS instead
          code: process.env.NODE_ENV === "development" ? code : undefined,
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Failed to request OTP:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP",
        });
      }
    }),

  /**
   * Verify OTP - Validate the code and create a session
   * Step 2 of the login flow
   */
  verifyOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(10).max(20),
        code: z.string().length(6, "OTP must be 6 digits"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        // Clean phone number
        const phone = input.phone.replace(/\D/g, "");
        const code = input.code.trim();

        if (phone.length < 10) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid phone number",
          });
        }

        // Get valid OTP from database
        const otp = await getValidOTP(phone);

        if (!otp) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "OTP expired or not found. Please request a new one.",
          });
        }

        // Check attempt limit (max 5 attempts)
        if (otp.attempts >= 5) {
          await deleteOTP(otp.id);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many failed attempts. Please request a new OTP.",
          });
        }

        // Verify OTP code
        if (otp.code !== code) {
          await incrementOTPAttempts(otp.id);
          const remainingAttempts = 5 - (otp.attempts + 1);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: `Invalid OTP. ${remainingAttempts} attempts remaining.`,
          });
        }

        // OTP is valid - get or create user
        let user = await getUserByPhone(phone);

        if (!user) {
          // Auto-create user on first successful login
          await upsertUser({
            phone,
            name: null,
            email: null,
            loginMethod: "phone_otp",
            role: "user",
            lastSignedIn: new Date(),
          });

          // Fetch the newly created user
          user = await getUserByPhone(phone);

          if (!user) {
            throw new TRPCError({
              code: "INTERNAL_SERVER_ERROR",
              message: "Failed to create user account",
            });
          }

          console.log(`[Auth] New user created: ${user.id} (${phone})`);
        } else {
          // Update last signed in for existing user
          await upsertUser({
            id: user.id,
            lastSignedIn: new Date(),
          });
        }

        // Delete used OTP
        await deleteOTP(otp.id);

        // Create JWT session token
        const sessionToken = await sdk.createSessionToken(user.id, phone);

        // Set session cookie
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365, // 1 year
        });

        console.log(`[Auth] User ${user.id} logged in successfully`);

        return {
          success: true,
          message: "Login successful",
          user: {
            id: user.id,
            phone: user.phone,
            name: user.name,
            email: user.email,
            role: user.role,
            avatarUrl: user.avatarUrl,
          },
        };
      } catch (error) {
        if (error instanceof TRPCError) throw error;
        console.error("[Auth] Failed to verify OTP:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to verify OTP",
        });
      }
    }),
});
