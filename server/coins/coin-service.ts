import { eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema";

/**
 * ============================================
 * 🪙 AFRITOK COIN SERVICE
 * ============================================
 */

/**
 * Récupère le portefeuille d'un utilisateur.
 *
 * S'il n'existe pas encore, on le crée avec :
 * balance = 0
 */
export async function getUserCoins(userId: number) {
  let wallet = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (wallet.length === 0) {
    const created = await db
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .returning();

    return created[0];
  }

  return wallet[0];
}

/**
 * ============================================
 * 💰 SOLDE
 * ============================================
 */

export async function getCoinBalance(userId: number) {
  const wallet = await getUserCoins(userId);

  return Number(wallet.balance);
}

/**
 * ============================================
 * 📋 HISTORIQUE
 * ============================================
 */

export async function getCoinTransactions(userId: number) {
  return await db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId))
    .orderBy(desc(coinTransactions.createdAt));
}
