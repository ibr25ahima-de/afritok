
import type { Request, Response } from "express";
import { Router } from "express";
import * as db from "../db";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getSessionCookieOptions } from "../_core/cookies";

const router = Router();

/**
 * Connexion simple par numéro de téléphone
 * (sans OAuth, sans Manus)
 */
router.post("/login", async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: "Phone is required" });
    }

    // Créer ou mettre à jour l'utilisateur
    const user = await db.upsertUser({
      phone,
      loginMethod: "phone",
      lastSignedIn: new Date(),
    });

    // Créer une session simple
    const sessionToken = Buffer.from(
      `${user.id}:${Date.now()}`
    ).toString("base64");

    res.cookie(COOKIE_NAME, sessionToken, {
      ...getSessionCookieOptions(req),
      maxAge: ONE_YEAR_MS,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("[AUTH] login failed", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

export default router;
