import { randomInt } from "node:crypto";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import {
  createOTP,
  getLatestOTP,
  consumeOTPAttempt,
  deleteOTP,
  getUserByPhone,
  upsertUser,
} from "./db";
import { sdk } from "./_core/sdk";
import { getSessionCookieOptions } from "./_core/cookies";
import { COOKIE_NAME } from "@shared/const";
import { SECURITY_LIMITS } from "./_core/security-constants";

const normalizePhone = (phone: string) => phone.replace(/\D/g, "");

export const authRouter = router({
  requestOtp: publicProcedure
    .input(z.object({
      phone: z.string().trim().min(10).max(25),
    }))
    .mutation(async ({ input }) => {
      const phone = normalizePhone(input.phone);
      if (phone.length < 10 || phone.length > 20) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Invalid phone number" });
      }

      try {
        const latest = await getLatestOTP(phone);
        if (latest && Date.now() - new Date(latest.createdAt).getTime() < SECURITY_LIMITS.otpWindowMs) {
          throw new TRPCError({
            code: "TOO_MANY_REQUESTS",
            message: "Veuillez patienter avant de demander un nouveau code.",
          });
        }

        const code = randomInt(100000, 1000000).toString();
        await createOTP(phone, code, SECURITY_LIMITS.otpExpiryMs / 60000);

        // Never log OTPs or phone numbers. In development only, the code may be returned
        // to preserve the local test flow; production requires a real SMS provider.
        return process.env.NODE_ENV === "development"
          ? { success: true, phone, code }
          : { success: true, phone };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[Auth] requestOtp failed");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to generate OTP" });
      }
    }),

  verifyOtp: publicProcedure
    .input(z.object({
      phone: z.string().trim().min(10).max(25),
      code: z.string().trim().regex(/^\d{6}$/),
    }))
    .mutation(async ({ ctx, input }) => {
      const phone = normalizePhone(input.phone);
      if (phone.length < 10 || phone.length > 20) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired or invalid" });
      }

      try {
        const otp = await getLatestOTP(phone);
        if (!otp || new Date(otp.expiresAt).getTime() <= Date.now()) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired or invalid" });
        }

        if (otp.attempts >= SECURITY_LIMITS.otpMaxAttempts) {
          await deleteOTP(otp.id);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts" });
        }

        const attempt = await consumeOTPAttempt(otp.id, SECURITY_LIMITS.otpMaxAttempts);
        if (!attempt || attempt.attempts > SECURITY_LIMITS.otpMaxAttempts) {
          await deleteOTP(otp.id);
          throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "Too many attempts" });
        }

        if (attempt.code !== input.code.trim()) {
          if (attempt.attempts >= SECURITY_LIMITS.otpMaxAttempts) await deleteOTP(otp.id);
          throw new TRPCError({ code: "BAD_REQUEST", message: "OTP expired or invalid" });
        }

        let user = await getUserByPhone(phone);
        if (!user) {
          await upsertUser({ phone, loginMethod: "phone_otp", role: "user", lastSignedIn: new Date() });
          user = await getUserByPhone(phone);
        } else {
          await upsertUser({ id: user.id, lastSignedIn: new Date() });
        }
        if (!user) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Authentication failed" });

        await deleteOTP(otp.id);
        const token = await sdk.createSessionToken(user.id, phone, {
          expiresInMs: SECURITY_LIMITS.sessionMaxAgeSeconds * 1000,
        });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, {
          ...cookieOptions,
          maxAge: SECURITY_LIMITS.sessionMaxAgeSeconds * 1000,
        });

        return { success: true, user };
      } catch (err) {
        if (err instanceof TRPCError) throw err;
        console.error("[Auth] verifyOtp failed");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "OTP verification failed" });
      }
    }),
});
