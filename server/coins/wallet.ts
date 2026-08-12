import { eq, sql } from "drizzle-orm";
import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema-coins";
import { db } from "../db";

/**
 * =========================================================
 * 💰 AFRITOK — WALLET / COINS
 * =========================================================
 *
 * Gestion sécurisée du portefeuille de coins.
 *
 * Règles importantes :
 *
 * - Le solde est toujours vérifié côté serveur.
 * - Le client ne peut jamais définir directement son solde.
 * - Chaque mouvement est enregistré dans coin_transactions.
 * - Les montants sont manipulés comme des chaînes NUMERIC
 *   côté PostgreSQL pour éviter les erreurs de précision.
 */


/**
 * =========================================================
 * 🔎 OBTENIR LE PORTEFEUILLE
 * =========================================================
 */
export async function getWallet(userId: number) {
  const result = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (result.length > 0) {
    return result[0];
  }

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


/**
 * =========================================================
 * 💰 OBTENIR UNIQUEMENT LE SOLDE
 * =========================================================
 */
export async function getBalance(userId: number): Promise<string> {
  const wallet = await getWallet(userId);

  return wallet.balance;
}


/**
 * =========================================================
 * 🆕 CRÉER UN PORTEFEUILLE SI NÉCESSAIRE
 * =========================================================
 */
export async function ensureWallet(userId: number) {
  return getWallet(userId);
}


/**
 * =========================================================
 * ➕ AJOUTER DES COINS
 * =========================================================
 *
 * Utilisé notamment après une recharge validée.
 *
 * ATTENTION :
 * Cette fonction ne doit être appelée qu'après validation
 * réelle du paiement par le serveur.
 */
export async function creditCoins(
  userId: number,
  amount: string,
  type:
    | "purchase"
    | "bonus"
    | "refund",
  referenceId?: string,
  description?: string
) {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid coin amount");
  }

  const wallet = await ensureWallet(userId);

  const balanceBefore = wallet.balance;

  const balanceAfter = await db.transaction(async (tx) => {
    const updated = await tx
      .update(userCoins)
      .set({
        balance: sql`${userCoins.balance} + ${amount}`,
        totalPurchased:
          type === "purchase"
            ? sql`${userCoins.totalPurchased} + ${amount}`
            : userCoins.totalPurchased,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCoins.userId, userId))
      .returning({
        balance: userCoins.balance,
      });

    if (updated.length === 0) {
      throw new Error("Wallet not found");
    }

    const newBalance = updated[0].balance;

    await tx.insert(coinTransactions).values({
      userId,
      type,
      amount,
      balanceBefore,
      balanceAfter: newBalance,
      referenceId,
      description,
    });

    return newBalance;
  });

  return {
    success: true,
    balance: balanceAfter,
  };
}


/**
 * =========================================================
 * ➖ DÉBITER DES COINS
 * =========================================================
 *
 * Cette fonction est utilisée pour les cadeaux.
 *
 * Le débit est effectué directement par PostgreSQL
 * uniquement si le solde est suffisant.
 */
export async function debitCoins(
  userId: number,
  amount: string,
  type: "gift_sent",
  referenceId?: string,
  description?: string
) {
  if (!amount || Number(amount) <= 0) {
    throw new Error("Invalid coin amount");
  }

  await ensureWallet(userId);

  const result = await db.transaction(async (tx) => {
    /**
     * Le UPDATE contient directement :
     *
     * balance >= amount
     *
     * Cela empêche le solde de devenir négatif
     * même si deux requêtes arrivent presque
     * exactement au même moment.
     */
    const updated = await tx
      .update(userCoins)
      .set({
        balance: sql`${userCoins.balance} - ${amount}`,
        totalSpent: sql`${userCoins.totalSpent} + ${amount}`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        sql`
          ${userCoins.userId} = ${userId}
          AND ${userCoins.balance} >= ${amount}
        `
      )
      .returning({
        balance: userCoins.balance,
      });

    if (updated.length === 0) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    const balanceAfter = updated[0].balance;

    /**
     * Pour récupérer le solde précédent,
     * on le calcule à partir du nouveau solde.
     */
    const balanceBefore = (
      Number(balanceAfter) + Number(amount)
    ).toFixed(2);

    await tx.insert(coinTransactions).values({
      userId,
      type,
      amount: `-${amount}`,
      balanceBefore,
      balanceAfter,
      referenceId,
      description,
    });

    return balanceAfter;
  });

  return {
    success: true,
    balance: result,
  };
}


/**
 * =========================================================
 * 📋 HISTORIQUE DES TRANSACTIONS
 * =========================================================
 */
export async function getCoinTransactions(
  userId: number,
  limit = 50
) {
  const safeLimit = Math.min(
    Math.max(limit, 1),
    100
  );

  return db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId))
    .orderBy(sql`${coinTransactions.createdAt} DESC`)
    .limit(safeLimit);
}
