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
 * - Le solde est toujours vérifié côté serveur.
 * - Le client ne peut jamais définir directement son solde.
 * - Chaque mouvement est enregistré dans coin_transactions.
 * - Les opérations sensibles sont atomiques et protégées
 *   contre les courses concurrentes.
 */

export async function getWallet(userId: number) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user id");
  }

  const result = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (result.length > 0) return result[0];

  const created = await db
    .insert(userCoins)
    .values({
      userId,
      balance: "0",
      totalPurchased: "0",
      totalSpent: "0",
    })
    .onConflictDoNothing({ target: userCoins.userId })
    .returning();

  if (created[0]) return created[0];

  const existing = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (!existing[0]) throw new Error("Wallet not found");
  return existing[0];
}

export async function getBalance(userId: number): Promise<string> {
  const wallet = await getWallet(userId);
  return wallet.balance;
}

export async function ensureWallet(userId: number) {
  return getWallet(userId);
}

/**
 * Ajoute des Coins uniquement depuis une opération serveur
 * déjà autorisée (paiement confirmé, bonus ou remboursement).
 * Une referenceId est traitée comme idempotency key lorsqu'elle
 * est fournie afin d'empêcher un double crédit.
 */
export async function creditCoins(
  userId: number,
  amount: string,
  type: "purchase" | "bonus" | "refund",
  referenceId?: string,
  description?: string
) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user id");
  }

  const numericAmount = Number(amount);
  if (
    !amount ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 100000000
  ) {
    throw new Error("Invalid coin amount");
  }

  const normalizedReference = referenceId?.trim();
  if (normalizedReference && normalizedReference.length > 100) {
    throw new Error("Invalid transaction reference");
  }

  return db.transaction(async (tx) => {
    if (normalizedReference) {
      const existing = await tx
        .select()
        .from(coinTransactions)
        .where(eq(coinTransactions.referenceId, normalizedReference))
        .limit(1);

      if (existing[0]) {
        if (
          existing[0].userId !== userId ||
          existing[0].type !== type ||
          Number(existing[0].amount) !== numericAmount
        ) {
          throw new Error("Transaction reference already used");
        }

        return {
          success: true,
          duplicate: true,
          balance: existing[0].balanceAfter,
          transaction: existing[0],
        };
      }
    }

    await tx
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({ target: userCoins.userId });

    const walletRows = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .for("update")
      .limit(1);

    const wallet = walletRows[0];
    if (!wallet) throw new Error("Wallet not found");

    const balanceBefore = Number(wallet.balance);
    if (!Number.isFinite(balanceBefore) || balanceBefore < 0) {
      throw new Error("Invalid wallet balance");
    }

    const balanceAfter = balanceBefore + numericAmount;
    const totalPurchased = Number(wallet.totalPurchased ?? 0);

    if (!Number.isFinite(totalPurchased) || totalPurchased < 0) {
      throw new Error("Invalid wallet totals");
    }

    const updated = await tx
      .update(userCoins)
      .set({
        balance: balanceAfter.toFixed(2),
        totalPurchased:
          type === "purchase"
            ? (totalPurchased + numericAmount).toFixed(2)
            : wallet.totalPurchased,
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCoins.userId, userId))
      .returning({ balance: userCoins.balance });

    if (!updated[0]) throw new Error("Wallet update failed");

    const [transaction] = await tx
      .insert(coinTransactions)
      .values({
        userId,
        type,
        amount: numericAmount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: updated[0].balance,
        referenceId: normalizedReference,
        description,
      })
      .returning();

    return {
      success: true,
      duplicate: false,
      balance: updated[0].balance,
      transaction,
    };
  });
}

/**
 * Débit atomique : PostgreSQL refuse l'opération si le solde
 * disponible est insuffisant, même sous requêtes concurrentes.
 */
export async function debitCoins(
  userId: number,
  amount: string,
  type: "gift_sent",
  referenceId?: string,
  description?: string
) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user id");
  }

  const numericAmount = Number(amount);
  if (
    !amount ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0 ||
    numericAmount > 100000000
  ) {
    throw new Error("Invalid coin amount");
  }

  const normalizedReference = referenceId?.trim();
  if (normalizedReference && normalizedReference.length > 100) {
    throw new Error("Invalid transaction reference");
  }

  return db.transaction(async (tx) => {
    if (normalizedReference) {
      const existing = await tx
        .select()
        .from(coinTransactions)
        .where(eq(coinTransactions.referenceId, normalizedReference))
        .limit(1);

      if (existing[0]) {
        if (
          existing[0].userId !== userId ||
          existing[0].type !== type ||
          Number(existing[0].amount) !== -numericAmount
        ) {
          throw new Error("Transaction reference already used");
        }

        return {
          success: true,
          duplicate: true,
          balance: existing[0].balanceAfter,
          transaction: existing[0],
        };
      }
    }

    await tx
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({ target: userCoins.userId });

    const updated = await tx
      .update(userCoins)
      .set({
        balance: sql`${userCoins.balance} - ${numericAmount.toFixed(2)}`,
        totalSpent: sql`${userCoins.totalSpent} + ${numericAmount.toFixed(2)}`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        sql`${userCoins.userId} = ${userId} AND ${userCoins.balance} >= ${numericAmount.toFixed(2)}`
      )
      .returning({ balance: userCoins.balance });

    if (!updated[0]) throw new Error("INSUFFICIENT_BALANCE");

    const balanceAfter = updated[0].balance;
    const balanceBefore = (Number(balanceAfter) + numericAmount).toFixed(2);

    const [transaction] = await tx
      .insert(coinTransactions)
      .values({
        userId,
        type,
        amount: `-${numericAmount.toFixed(2)}`,
        balanceBefore,
        balanceAfter,
        referenceId: normalizedReference,
        description,
      })
      .returning();

    return {
      success: true,
      duplicate: false,
      balance: balanceAfter,
      transaction,
    };
  });
}

export async function getCoinTransactions(userId: number, limit = 50) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Invalid user id");
  }

  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  return db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId))
    .orderBy(sql`${coinTransactions.createdAt} DESC`)
    .limit(safeLimit);
}
