import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { getUserById } from "../db"; // 🔥 IMPORTANT

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    const cookieHeader = opts.req.headers.cookie;

    if (cookieHeader) {
      const match = cookieHeader.match(/app_session_id=([^;]+)/);

      if (match) {
        const token = match[1];

        const decoded: any = jwt.verify(
          token,
          process.env.JWT_SECRET || "secret"
        );

        // ✅ 🔥 VÉRIFICATION EN BASE
        const dbUser = await getUserById(decoded.userId);

        if (dbUser) {
          user = dbUser;
        }
      }
    }
  } catch (error) {
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
