import type { Request, Response } from "express";
import { Router } from "express";
import jwt from "jsonwebtoken";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Store OTP temporairement (en mémoire pour dev, DB pour prod)
const OTP_STORE = new Map<string, { code: string; expiresAt: number }>();

/**
 * 1️⃣ DEMANDER UN OTP
 */
router.post("/request-otp", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || typeof phone !== "string") {
      return res.status(400).json({ error: "Phone is required" });
    }

    // Valider format téléphone
    if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
      return res.status(400).json({ error: "Invalid phone format" });
    }

    // Générer OTP 6 chiffres
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // Stocker avec expiration (10 minutes)
    const expiresAt = Date.now() + 10 * 60 * 1000;
    OTP_STORE.set(phone, { code: otp, expiresAt });

    // 📌 Log pour développement
    console.log(`[OTP] ${phone} => ${otp}`);

    // TODO: Envoyer SMS réel
    // import twilio from "twilio";
    // const client = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);
    // await client.messages.create({
    //   body: `Your Afritok verification code is: ${otp}`,
    //   from: TWILIO_PHONE_NUMBER,
    //   to: phone,
    // });

    return res.json({ success: true, message: "OTP sent" });
  } catch (err) {
    console.error("[AUTH] request-otp failed", err);
    return res.status(500).json({ error: "Failed to send OTP" });
  }
});

/**
 * 2️⃣ VÉRIFIER OTP ET CRÉER SESSION
 */
router.post("/verify-otp", async (req: Request, res: Response) => {
  try {
    const { phone, code } = req.body;

    if (!phone || !code) {
      return res.status(400).json({ error: "Phone and code required" });
    }

    // Vérifier OTP
    const stored = OTP_STORE.get(phone);

    if (!stored) {
      return res.status(401).json({ error: "No OTP requested for this phone" });
    }

    if (stored.expiresAt < Date.now()) {
      OTP_STORE.delete(phone);
      return res.status(401).json({ error: "OTP expired" });
    }

    if (stored.code !== code) {
      return res.status(401).json({ error: "Invalid code" });
    }

    // Nettoyer OTP
    OTP_STORE.delete(phone);

    // Créer ou mettre à jour l'utilisateur
    const user = await db.upsertUser({
      phone,
      loginMethod: "otp",
      lastSignedIn: new Date(),
    });

    // Créer JWT
    const sessionToken = jwt.sign(
      { userId: user.id, phone: user.phone },
      JWT_SECRET,
      { expiresIn: "30d" }
    );

    // Définir cookie
    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });

    return res.json({ success: true, user: { id: user.id, phone: user.phone } });
  } catch (err) {
    console.error("[AUTH] verify-otp failed", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

/**
 * 3️⃣ OBTENIR L'UTILISATEUR ACTUEL
 */
router.get("/me", async (req: Request, res: Response) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];

    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; phone: string };
    const user = await db.getUserById(decoded.userId);

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: { id: user.id, phone: user.phone, name: user.name } });
  } catch (err) {
    console.error("[AUTH] me failed", err);
    return res.status(401).json({ error: "Invalid session" });
  }
});

/**
 * 4️⃣ DÉCONNEXION
 */
router.post("/logout", (req: Request, res: Response) => {
  res.clearCookie(COOKIE_NAME);
  return res.json({ success: true, message: "Logged out" });
});

export default router;
                  
