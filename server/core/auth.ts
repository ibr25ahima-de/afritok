import { z } from "zod";
import jwt from "jsonwebtoken";
import { publicProcedure, router } from "../trpc";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Stockage OTP temporaire (simple, sans DB pour l’instant)
const OTP_STORE = new Map<string, string>();

export const authRouter = router({
  // ======================
  // REQUEST OTP
  // ======================
  requestOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      OTP_STORE.set(input.phone, otp);

      // Visible dans les logs Render
      console.log(`[OTP] ${input.phone} => ${otp}`);

      return { success: true };
    }),

  // ======================
  // VERIFY OTP
  // ======================
  verifyOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(6),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const validCode = OTP_STORE.get(input.phone);

      if (validCode !== input.code) {
        throw new Error("Invalid OTP code");
      }

      OTP_STORE.delete(input.phone);

      const token = jwt.sign(
        { phone: input.phone },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      ctx.res.cookie("afritok_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return { success: true };
    }),
});
