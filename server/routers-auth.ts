
import { router, publicProcedure } from "./trpc";
import { z } from "zod";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// stockage OTP simple (temporaire)
const otpStore = new Map<string, string>();

export const authRouter = router({
  // =========================
  // 1️⃣ Demande du code OTP
  // =========================
  requestOtp: publicProcedure
    .input(
      z.object({
        phone: z.string().min(6),
      })
    )
    .mutation(async ({ input }) => {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();

      otpStore.set(input.phone, otp);

      // 📌 Visible dans les logs Render
      console.log(`[OTP] ${input.phone} => ${otp}`);

      return { success: true };
    }),

  // =========================
  // 2️⃣ Vérification OTP
  // =========================
  verifyOtp: publicProcedure
    .input(
      z.object({
        phone: z.string(),
        code: z.string().length(6),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const savedCode = otpStore.get(input.phone);

      if (!savedCode || savedCode !== input.code) {
        throw new Error("Code invalide");
      }

      otpStore.delete(input.phone);

      const token = jwt.sign(
        { phone: input.phone },
        JWT_SECRET,
        { expiresIn: "30d" }
      );

      ctx.res?.cookie("afritok_session", token, {
        httpOnly: true,
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 30 * 24 * 60 * 60 * 1000,
      });

      return { success: true };
    }),

  // =========================
  // 3️⃣ Déconnexion
  // =========================
  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res?.clearCookie("afritok_session");
    return { success: true };
  }),
});
