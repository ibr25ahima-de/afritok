import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  userWallets,
} from "../../drizzle/schema-wallet";

/**
 * =========================================================
 * 💰 AFRITOK — WALLET SERVICE
 * =========================================================
 *
 * Gestion du portefeuille XOF de l'utilisateur.
 *
 * IMPORTANT :
 * Ce portefeuille est séparé :
 *
 * 💰 Solde XOF
 * 🪙 Coins
 * 💵 Earnings
 */

/**
 * =========================================================
 * 💰 RÉCUPÉRER / CRÉER LE PORTEFEUILLE
 * =========================================================
 */

export async function getUserWallet(userId: number) {
  if (!userId) {
    throw new Error("Utilisateur invalide.");
  }

  let wallet = await db
    .select()
    .from(userWallets)
    .where(eq(userWallets.userId, userId))
    .limit(1);

  /**
   * Créer automatiquement le portefeuille
   * s'il n'existe pas encore.
   */
  if (wallet.length === 0) {
    await db
      .insert(userWallets)
      .values({
        userId,
        balance: "0",
        totalDeposited: "0",
        totalUsedForCoins: "0",
      })
      .onConflictDoNothing({
        target: userWallets.userId,
      });

    wallet = await db
      .select()
      .from(userWallets)
      .where(eq(userWallets.userId, userId))
      .limit(1);
  }

  if (wallet.length === 0) {
    throw new Error(
      "Impossible de créer le portefeuille XOF."
    );
  }

  return wallet[0];
}

/**
 * =========================================================
 * 💰 SOLDE XOF
 * =========================================================
 */

export async function getWalletBalance(userId: number) {
  const wallet = await getUserWallet(userId);

  return Number(wallet.balance);
}
