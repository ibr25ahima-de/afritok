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

// 🔒 Normalisation unique du téléphone
const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export const authRouter = router({
  requestOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(10).max(25),
      })
    )
    .mutation(async ({ input }) => {
      try {
        const phone = normalizePhone(input.phone);

        if (phone.length < 10) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid phone number",
          });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        await createOTP(phone, code, 10);

        console.log(`[Auth] OTP generated for ${phone}: ${code}`);

        return {
          success: true,
          phone, // ✅ RENVOI DU TÉLÉPHONE NORMALISÉ AU FRONT
          code: process.env.NODE_ENV === "development" ? code : undefined,
        };
      } catch (err) {
        console.error("[Auth] requestOtp error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to send OTP",
        });
      }
    }),

  verifyOtp: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const phone = normalizePhone(input.phone);
        const code = input.code.trim();

        const otp = await getValidOTP(phone);

        if (!otp) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "OTP expired or invalid",
          });
        }

        if (otp.attempts >= 5) {
          await deleteOTP(otp.id);
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Too many attempts",
          });
        }

        if (otp.code !== code) {
          await incrementOTPAttempts(otp.id);
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Invalid OTP",
          });
        }

        let user = await getUserByPhone(phone);

        if (!user) {
          await upsertUser({
            phone,
            loginMethod: "phone_otp",
            role: "user",
            lastSignedIn: new Date(),
          });
          user = await getUserByPhone(phone);
        } else {
          await upsertUser({
            id: user.id,
            lastSignedIn: new Date(),
          });
        }

        await deleteOTP(otp.id);

        const token = await sdk.createSessionToken(user!.id, phone);

        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: 1000 * 60 * 60 * 24 * 365,
        });

        return {
          success: true,
          user,
        };
      } catch (err) {
        console.error("[Auth] verifyOtp error:", err);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "OTP verification failed",
        });
      }
    }),
});
