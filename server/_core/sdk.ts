import { AXIOS_TIMEOUT_MS, COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import axios, { type AxiosInstance } from "axios";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";
import { SECURITY_LIMITS } from "./security-constants";

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0;

export type SessionPayload = {
  userId: number;
  phone: string;
};

class SDKServer {
  private getSessionSecret() {
    const secret = ENV.cookieSecret;
    return new TextEncoder().encode(secret);
  }

  async createSessionToken(
    userId: number,
    phone: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    return this.signSession({ userId, phone }, options);
  }

  async signSession(
    payload: SessionPayload,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const defaultLifetimeMs = SECURITY_LIMITS.sessionMaxAgeSeconds * 1000;
    const requestedLifetimeMs = options.expiresInMs ?? defaultLifetimeMs;
    const expiresInMs = Math.min(Math.max(requestedLifetimeMs, 1), defaultLifetimeMs);
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({ userId: payload.userId, phone: payload.phone })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  async verifySession(cookieValue: string | undefined | null): Promise<{ userId: number; phone: string } | null> {
    if (!cookieValue) return null;
    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, { algorithms: ["HS256"] });
      const { userId, phone } = payload as Record<string, unknown>;
      if (typeof userId !== "number" || !Number.isSafeInteger(userId) || userId <= 0 || !isNonEmptyString(phone)) {
        return null;
      }
      return { userId, phone };
    } catch {
      return null;
    }
  }

  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) return new Map<string, string>();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) throw ForbiddenError("Invalid session cookie");

    const signedInAt = new Date();
    const user = await db.getUserById(session.userId);
    if (!user) throw ForbiddenError("User not found");

    await db.upsertUser({ id: user.id, lastSignedIn: signedInAt });
    return user;
  }
}

export const sdk = new SDKServer();
