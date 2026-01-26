import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import jwt from "jsonwebtoken";
import { getUserById } from "../db";
import { COOKIE_NAME } from "@shared/const";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
};

/**
 * Créer le contexte tRPC
 * Récupère l'utilisateur depuis le JWT dans les cookies
 * Simple et efficace pour l'Afrique
 */
export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;

  try {
    // Récupérer le token JWT depuis les cookies
    const token = opts.req.cookies?.[COOKIE_NAME];

    if (token) {
      // Vérifier et décoder le JWT
      const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number; phone: string };

      // Récupérer l'utilisateur depuis la base de données
      user = await getUserById(decoded.userId);

      if (!user) {
        console.warn(`[Context] Utilisateur introuvable: ${decoded.userId}`);
        user = null;
      }
    }
  } catch (error) {
    // L'authentification est optionnelle pour les procédures publiques
    console.warn("[Context] Erreur lors de l'authentification:", error);
    user = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
  };
}
