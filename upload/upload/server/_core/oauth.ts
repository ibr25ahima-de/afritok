import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import type { Express, Request, Response } from "express";
import * as db from "../db";
import { getSessionCookieOptions } from "./cookies";
import { sdk } from "./sdk";

/**
 * 🔑 Route INITIALE de connexion
 * 👉 C’est ELLE qui manquait
 */
export function registerOAuthRoutes(app: Express) {

  // 🔥 DÉMARRAGE LOGIN
  app.get("/app-auth", async (req: Request, res: Response) => {
    try {
      const redirectUri = `${req.protocol}://${req.get("host")}/api/oauth/callback`;
      const state = Buffer.from(redirectUri).toString("base64");

      const authUrl = sdk.getAuthorizationUrl({
        redirectUri,
        state,
        type: "signIn",
      });

      res.redirect(authUrl);
    } catch (err) {
      console.error("[OAuth] Failed to start auth", err);
      res.status(500).send("OAuth init failed");
    }
  });

  // 🔁 CALLBACK OAUTH
  app.get("/api/oauth/callback", async (req: Request, res: Response) => {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;

    if (!code || !state) {
      res.status(400).json({ error: "code and state are required" });
      return;
    }

    try {
      const tokenResponse = await sdk.exchangeCodeForToken(code, state);
      const userInfo = await sdk.getUserInfo(tokenResponse.accessToken);

      if (!userInfo.openId) {
        res.status(400).json({ error: "openId missing from user info" });
        return;
      }

      await db.upsertUser({
        openId: userInfo.openId,
        name: userInfo.name || null,
        email: userInfo.email ?? null,
        loginMethod: userInfo.loginMethod ?? userInfo.platform ?? null,
        lastSignedIn: new Date(),
      });

      const sessionToken = await sdk.createSessionToken(userInfo.openId, {
        name: userInfo.name || "",
        expiresInMs: ONE_YEAR_MS,
      });

      const cookieOptions = getSessionCookieOptions(req);
      res.cookie(COOKIE_NAME, sessionToken, {
        ...cookieOptions,
        maxAge: ONE_YEAR_MS,
      });

      res.redirect("/");
    } catch (error) {
      console.error("[OAuth] Callback failed", error);
      res.status(500).json({ error: "OAuth callback failed" });
    }
  });
  }
