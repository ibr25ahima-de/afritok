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
 *
 * Les Coins sont totalement séparés du système
 * Earnings / argent existant.
 *
 * Ce service gère uniquement :
 * - le portefeuille Coins
 * - les crédits
 * - les dépenses
 * - les transactions
 */

/**
 * ============================================
 * 💰 RÉCUPÉRER / CRÉER LE PORTEFEUILLE
 * ============================================
 */

export async function getUserCoins(userId: number) {
  let wallet = await db
    .select()
    .from(userCoins)
    .where(eq(userCoins.userId, userId))
    .limit(1);

  if (wallet.length === 0) {
    /**
     * userId est UNIQUE dans user_coins.
     *
     * On tente la création puis on relit le portefeuille.
     * Cela évite les problèmes si deux requêtes arrivent
     * au même moment pour un nouvel utilisateur.
     */
    await db
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    wallet = await db
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .limit(1);
  }

  if (wallet.length === 0) {
    throw new Error("Impossible de créer le portefeuille Coins.");
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
 * ➕ CRÉDITER DES COINS
 * ============================================
 *
 * Utilisations prévues :
 *
 * purchase
 * → Coins obtenus après une recharge/paiement confirmé
 *
 * bonus
 * → Bonus offert par la plateforme
 *
 * refund
 * → Remboursement
 *
 * gift_received
 * → Coins reçus lorsqu'un utilisateur reçoit
 *   un cadeau, si cette règle est retenue.
 */

export async function creditCoins(
  userId: number,
  amount: number,
  type:
    | "purchase"
    | "bonus"
    | "refund"
    | "gift_received",
  referenceId?: string,
  description?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Le montant de Coins doit être supérieur à zéro."
    );
  }

  return await db.transaction(async (tx) => {
    /**
     * S'assurer que le portefeuille existe.
     */
    await tx
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    /**
     * VERROU DE LIGNE
     *
     * FOR UPDATE empêche une autre opération
     * concurrente de modifier ce portefeuille
     * pendant notre opération.
     */
    const wallets = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .for("update");

    if (wallets.length === 0) {
      throw new Error("Portefeuille Coins introuvable.");
    }

    const wallet = wallets[0];

    const balanceBefore = Number(wallet.balance);
    const balanceAfter = balanceBefore + amount;

    const totalPurchased =
      type === "purchase"
        ? Number(wallet.totalPurchased) + amount
        : Number(wallet.totalPurchased);

    /**
     * Mise à jour du portefeuille.
     */
    await tx
      .update(userCoins)
      .set({
        balance: balanceAfter.toFixed(2),
        totalPurchased: totalPurchased.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCoins.userId, userId));

    /**
     * Historique obligatoire.
     */
    const transaction = await tx
      .insert(coinTransactions)
      .values({
        userId,
        type,
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        referenceId: referenceId ?? null,
        description: description ?? null,
      })
      .returning();

    return {
      success: true,
      balanceBefore,
      balanceAfter,
      amount,
      transaction: transaction[0],
    };
  });
}

/**
 * ============================================
 * ➖ DÉPENSER DES COINS
 * ============================================
 *
 * Utilisation principale :
 *
 * gift_sent
 * → envoyer un cadeau à un créateur
 *
 * IMPORTANT :
 * Le prix définitif du cadeau sera récupéré
 * côté serveur lorsque nous construirons le
 * catalogue Gifts.
 */

export async function spendCoins(
  userId: number,
  amount: number,
  type: "gift_sent",
  referenceId?: string,
  description?: string
) {
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error(
      "Le montant de Coins doit être supérieur à zéro."
    );
  }

  return await db.transaction(async (tx) => {
    /**
     * S'assurer que le portefeuille existe.
     */
    await tx
      .insert(userCoins)
      .values({
        userId,
        balance: "0",
        totalPurchased: "0",
        totalSpent: "0",
      })
      .onConflictDoNothing({
        target: userCoins.userId,
      });

    /**
     * VERROUILLAGE DU PORTEFEUILLE
     *
     * Une seule opération peut modifier le
     * portefeuille à la fois.
     */
    const wallets = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .for("update");

    if (wallets.length === 0) {
      throw new Error("Portefeuille Coins introuvable.");
    }

    const wallet = wallets[0];

    const balanceBefore = Number(wallet.balance);

    /**
     * Vérification serveur.
     */
    if (balanceBefore < amount) {
      throw new Error("Solde de Coins insuffisant.");
    }

    const balanceAfter = balanceBefore - amount;

    const totalSpent =
      Number(wallet.totalSpent) + amount;

    /**
     * Débit du portefeuille.
     */
    await tx
      .update(userCoins)
      .set({
        balance: balanceAfter.toFixed(2),
        totalSpent: totalSpent.toFixed(2),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userCoins.userId, userId));

    /**
     * Historique obligatoire.
     */
    const transaction = await tx
      .insert(coinTransactions)
      .values({
        userId,
        type,
        amount: amount.toFixed(2),
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        referenceId: referenceId ?? null,
        description: description ?? null,
      })
      .returning();

    return {
      success: true,
      balanceBefore,
      balanceAfter,
      amount,
      transaction: transaction[0],
    };
  });
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
