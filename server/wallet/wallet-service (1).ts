import { eq } from "drizzle-orm";
import { db } from "../db";
import {
  userWallets,
  walletTransactions,
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

/**
 * =========================================================
 * 📱 CRÉER UNE RECHARGE EN ATTENTE
 * =========================================================
 *
 * Cette fonction n'ajoute PAS encore l'argent au solde.
 *
 * Elle crée uniquement une opération "pending".
 *
 * Le solde sera crédité uniquement après confirmation
 * réelle du paiement Mobile Money.
 */

export async function createPendingWalletDeposit({
  userId,
  amount,
  paymentMethod,
  phone,
  referenceId,
}: {
  userId: number;
  amount: number;
  paymentMethod: string;
  phone: string;
  referenceId: string;
}) {
  if (!userId) {
    throw new Error("Utilisateur invalide.");
  }

  if (!Number.isFinite(amount) || amount < 1000) {
    throw new Error(
      "Le montant minimum de recharge est de 1 000 XOF."
    );
  }

  if (!paymentMethod) {
    throw new Error("Opérateur de paiement invalide.");
  }

  if (!phone || phone.replace(/\D/g, "").length < 8) {
    throw new Error("Numéro de téléphone invalide.");
  }

  if (!referenceId) {
    throw new Error("Référence de paiement invalide.");
  }

  const wallet = await getUserWallet(userId);

  const transaction =
    await db
      .insert(walletTransactions)
      .values({
        userId,
        type: "deposit",
        amount: amount.toFixed(2),
        balanceBefore: Number(
          wallet.balance
        ).toFixed(2),
        balanceAfter: Number(
          wallet.balance
        ).toFixed(2),
        referenceId,
        paymentMethod,
        status: "pending",
        description:
          `Recharge de ${amount.toLocaleString(
            "fr-FR"
          )} XOF avec ${paymentMethod} - ${phone}`,
      })
      .returning();

  return {
    success: true,
    status: "pending",
    transaction: transaction[0],
  };
}
