import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { getUserById } from "../db";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET is not configured with sufficient entropy");
  }
  return secret;
}

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const token = opts.req.cookies?.app_session_id;

    if (token) {
      const decoded = jwt.verify(token, getJwtSecret(), {
        algorithms: ["HS256"],
      }) as jwt.JwtPayload & { userId?: number };

      if (typeof decoded.userId === "number" && Number.isInteger(decoded.userId) && decoded.userId > 0) {
        const dbUser = await getUserById(decoded.userId);
        if (dbUser) user = dbUser;
      }
    }
  } catch {
    // Invalid, expired, or missing sessions are treated as unauthenticated.
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
