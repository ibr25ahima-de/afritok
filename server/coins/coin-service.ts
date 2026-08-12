import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";

import { db } from "../db";
import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema";

/**
 * ============================================
 * 🪙 AFRITOK COIN SERVICE
 * ============================================
 *
 * Service central pour gérer les coins.
 *
 * IMPORTANT :
 * - Les coins sont virtuels.
 * - Aucun argent réel n'est créé ici.
 * - Aucun paiement réel n'est branché ici.
 * - Chaque mouvement est enregistré.
 */

/**
 * ============================================
 * 🔎 RÉCUPÉRER LE PORTEFEUILLE
 * ============================================
 */

export async function getUserCoins(userId: number) {
  let wallet = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  /**
   * Si l'utilisateur n'a pas encore
   * de portefeuille, on le crée.
   */
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
 * 🪙 SOLDE
 * ============================================
 */

export async function getCoinBalance(userId: number) {
  const wallet = await getUserCoins(userId);

  return Number(wallet.balance);
}

/**
 * ============================================
 * ➕ AJOUTER DES COINS
 * ============================================
 *
 * Utilisé plus tard pour :
 *
 * - achat réel
 * - bonus
 * - remboursement
 *
 * Pour le moment aucun paiement réel
 * n'est connecté à cette fonction.
 */

export async function addCoins(
  userId: number,
  amount: number,
  type:
    | "purchase"
    | "bonus"
    | "refund",
  description?: string,
  referenceId?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le nombre de coins doit être supérieur à zéro.",
    });
  }

  const wallet = await getUserCoins(userId);

  const balanceBefore = Number(wallet.balance);
  const balanceAfter = balanceBefore + amount;

  const totalPurchased =
    Number(wallet.totalPurchased) +
    (type === "purchase" ? amount : 0);

  const updated = await db
    .update(userCoins)
    .set({
      balance: balanceAfter.toFixed(2),
      totalPurchased: totalPurchased.toFixed(2),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userCoins.id, wallet.id))
    .returning();

  await db.insert(coinTransactions).values({
    userId,
    type,
    amount: amount.toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
    referenceId,
    description,
  });

  return updated[0];
}

/**
 * ============================================
 * ➖ RETIRER DES COINS
 * ============================================
 *
 * Utilisé notamment lorsqu'un utilisateur
 * envoie un cadeau.
 */

export async function spendCoins(
  userId: number,
  amount: number,
  description?: string,
  referenceId?: string,
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Le nombre de coins doit être supérieur à zéro.",
    });
  }

  const wallet = await getUserCoins(userId);

  const balanceBefore = Number(wallet.balance);

  /**
   * 🚫 Empêcher le solde négatif.
   */
  if (amount > balanceBefore) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Solde de coins insuffisant.",
    });
  }

  const balanceAfter = balanceBefore - amount;

  const totalSpent =
    Number(wallet.totalSpent) + amount;

  const updated = await db
    .update(userCoins)
    .set({
      balance: balanceAfter.toFixed(2),
      totalSpent: totalSpent.toFixed(2),
      updatedAt: new Date().toISOString(),
    })
    .where(eq(userCoins.id, wallet.id))
    .returning();

  await db.insert(coinTransactions).values({
    userId,
    type: "gift_sent",
    amount: (-amount).toFixed(2),
    balanceBefore: balanceBefore.toFixed(2),
    balanceAfter: balanceAfter.toFixed(2),
    referenceId,
    description,
  });

  return updated[0];
}

/**
 * ============================================
 * 📋 HISTORIQUE
 * ============================================
 */

export async function getCoinTransactions(
  userId: number,
) {
  return await db
    .select()
    .from(coinTransactions)
    .where(eq(coinTransactions.userId, userId));
}
