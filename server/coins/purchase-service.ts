import { db } from "../db";
import {
  userCoins,
  coinTransactions,
} from "../../drizzle/schema-coins";
import { payments } from "../../drizzle/schema-payments";
import {
  platformWallet,
  platformTransactions,
} from "../../drizzle/schema-platform-finance";
import { eq, and, sql } from "drizzle-orm";

/**
 * =========================================================
 * 🪙 AFRITOK — COIN PURCHASE SERVICE
 * =========================================================
 *
 * Coins are credited only after a server-confirmed payment.
 * The payment row is locked during the whole transaction so
 * concurrent requests for the same payment cannot both pass
 * the duplicate check and credit the wallet twice.
 */

export const COIN_PACKAGES = [
  { id: "coins_100", coins: 100, price: 100, currency: "XOF", name: "100 Coins" },
  { id: "coins_500", coins: 500, price: 500, currency: "XOF", name: "500 Coins" },
  { id: "coins_1000", coins: 1000, price: 1000, currency: "XOF", name: "1 000 Coins" },
  { id: "coins_5000", coins: 5000, price: 5000, currency: "XOF", name: "5 000 Coins" },
  { id: "coins_10000", coins: 10000, price: 10000, currency: "XOF", name: "10 000 Coins" },
] as const;

export function getCoinPackages() {
  return COIN_PACKAGES;
}

export async function purchaseCoins({
  userId,
  packageId,
  paymentReference,
}: {
  userId: number;
  packageId: string;
  paymentReference: string;
}) {
  if (!Number.isInteger(userId) || userId <= 0) {
    throw new Error("Utilisateur invalide.");
  }

  if (!paymentReference || paymentReference.length < 5 || paymentReference.length > 150) {
    throw new Error("Référence de paiement invalide.");
  }

  const coinPackage = COIN_PACKAGES.find((item) => item.id === packageId);
  if (!coinPackage) throw new Error("Package Coins introuvable.");

  return await db.transaction(async (tx) => {
    // Lock the payment first. This serializes concurrent coin-credit attempts
    // for the same payment reference before the idempotency check below.
    const paymentResult = await tx
      .select()
      .from(payments)
      .where(and(eq(payments.referenceId, paymentReference), eq(payments.userId, userId)))
      .limit(1)
      .for("update");

    if (paymentResult.length === 0) throw new Error("Paiement introuvable.");
    const payment = paymentResult[0];

    if (payment.purpose !== "coin_purchase") {
      throw new Error("Ce paiement n'est pas destiné à l'achat de Coins.");
    }
    if (!payment.productId) throw new Error("Produit Coins manquant sur le paiement.");
    if (payment.productId !== packageId) {
      throw new Error("Le produit du paiement ne correspond pas au package Coins demandé.");
    }
    if (payment.status !== "success") {
      throw new Error("Le paiement n'est pas encore confirmé.");
    }
    if (payment.currency !== coinPackage.currency) {
      throw new Error("Devise de paiement invalide.");
    }

    const requestedAmount = Number(payment.amount);
    const confirmedAmount = Number(payment.confirmedAmount);
    if (!Number.isFinite(requestedAmount) || requestedAmount !== coinPackage.price) {
      throw new Error("Montant initial du paiement invalide.");
    }
    if (!Number.isFinite(confirmedAmount) || confirmedAmount !== coinPackage.price) {
      throw new Error("Montant confirmé invalide.");
    }
    if (!payment.providerReference || payment.providerReference.length < 1) {
      throw new Error("Référence du prestataire manquante.");
    }

    const existingTransaction = await tx
      .select()
      .from(coinTransactions)
      .where(eq(coinTransactions.referenceId, paymentReference))
      .limit(1);

    if (existingTransaction.length > 0) {
      return { success: true, duplicate: true, transaction: existingTransaction[0] };
    }

    const existingPlatformTransaction = await tx
      .select()
      .from(platformTransactions)
      .where(eq(platformTransactions.externalId, paymentReference))
      .limit(1);

    if (existingPlatformTransaction.length > 0) {
      throw new Error("Transaction plateforme déjà enregistrée sans crédit Coins correspondant.");
    }

    await tx.execute(sql`select pg_advisory_xact_lock(872342)`);

    let platformWalletResult = await tx.select().from(platformWallet).for("update");
    if (platformWalletResult.length > 1) {
      throw new Error("Plusieurs portefeuilles plateforme existent. Correction de la base requise.");
    }

    if (platformWalletResult.length === 0) {
      await tx.insert(platformWallet).values({
        name: "AfriTok",
        balance: "0",
        totalRevenue: "0",
        totalExpenses: "0",
        currency: "XOF",
      });
      platformWalletResult = await tx.select().from(platformWallet).for("update");
    }

    const platform = platformWalletResult[0];
    if (!platform) throw new Error("Portefeuille plateforme introuvable.");

    const platformBalanceBefore = Number(platform.balance);
    const platformRevenueBefore = Number(platform.totalRevenue);
    if (!Number.isFinite(platformBalanceBefore) || !Number.isFinite(platformRevenueBefore)) {
      throw new Error("Solde plateforme invalide.");
    }

    const platformBalanceAfter = platformBalanceBefore + confirmedAmount;
    const platformRevenueAfter = platformRevenueBefore + confirmedAmount;

    await tx.update(platformWallet).set({
      balance: platformBalanceAfter.toFixed(4),
      totalRevenue: platformRevenueAfter.toFixed(4),
      updatedAt: new Date().toISOString(),
    }).where(eq(platformWallet.id, platform.id));

    await tx.insert(platformTransactions).values({
      userId,
      amount: confirmedAmount.toFixed(4),
      currency: payment.currency,
      direction: "in",
      source: "coin_purchase",
      status: "completed",
      paymentProvider: payment.operator,
      paymentReference: payment.providerReference,
      externalId: paymentReference,
      description: `Paiement Coins confirmé — ${coinPackage.name}`,
    });

    await tx.insert(userCoins).values({
      userId,
      balance: "0",
      totalPurchased: "0",
      totalSpent: "0",
    }).onConflictDoNothing({ target: userCoins.userId });

    const wallets = await tx
      .select()
      .from(userCoins)
      .where(eq(userCoins.userId, userId))
      .limit(1)
      .for("update");

    if (wallets.length === 0) throw new Error("Portefeuille Coins introuvable.");
    const wallet = wallets[0];

    const balanceBefore = Number(wallet.balance);
    const purchasedBefore = Number(wallet.totalPurchased);
    if (!Number.isFinite(balanceBefore) || balanceBefore < 0 || !Number.isFinite(purchasedBefore) || purchasedBefore < 0) {
      throw new Error("Solde Coins invalide.");
    }

    const balanceAfter = balanceBefore + coinPackage.coins;
    const totalPurchased = purchasedBefore + coinPackage.coins;

    await tx.update(userCoins).set({
      balance: balanceAfter.toFixed(2),
      totalPurchased: totalPurchased.toFixed(2),
      updatedAt: new Date().toISOString(),
    }).where(eq(userCoins.userId, userId));

    const transactionResult = await tx.insert(coinTransactions).values({
      userId,
      type: "purchase",
      amount: coinPackage.coins.toFixed(2),
      balanceBefore: balanceBefore.toFixed(2),
      balanceAfter: balanceAfter.toFixed(2),
      referenceId: paymentReference,
      description: `Achat de ${coinPackage.coins} Coins`,
    }).returning();

    return {
      success: true,
      duplicate: false,
      package: coinPackage,
      paymentId: payment.id,
      paymentReference,
      balanceBefore,
      balanceAfter,
      coins: coinPackage.coins,
      transaction: transactionResult[0],
    };
  });
}
