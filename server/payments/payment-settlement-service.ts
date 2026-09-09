import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import {
  platformWallet,
  platformTransactions,
} from "../../drizzle/schema-platform-finance";
import { eq, and } from "drizzle-orm";

/**
 * Finalise un paiement réellement confirmé et crédite le solde réel AfriTok.
 *
 * Idempotent : la même référence de paiement ne peut créditer le portefeuille
 * qu'une seule fois grâce à externalId = payment:<referenceId>.
 */
export async function settleConfirmedPayment(params: {
  referenceId: string;
  providerReference: string;
  confirmedAmount: number;
}) {
  if (!params.referenceId.trim()) {
    throw new Error("Référence interne manquante.");
  }

  if (!params.providerReference.trim()) {
    throw new Error("Référence du prestataire manquante.");
  }

  if (!Number.isFinite(params.confirmedAmount) || params.confirmedAmount <= 0) {
    throw new Error("Montant confirmé invalide.");
  }

  return db.transaction(async (tx) => {
    // Lock the payment so two webhook deliveries cannot settle it concurrently.
    const paymentRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.referenceId, params.referenceId))
      .limit(1)
      .for("update");

    if (paymentRows.length === 0) {
      throw new Error("Transaction de paiement introuvable.");
    }

    const payment = paymentRows[0];
    const requestedAmount = Number(payment.amount);

    if (!Number.isFinite(requestedAmount) || requestedAmount <= 0) {
      throw new Error("Montant demandé du paiement invalide.");
    }

    if (Math.abs(params.confirmedAmount - requestedAmount) > 0.001) {
      throw new Error("Le montant confirmé ne correspond pas au montant demandé.");
    }

    // A payment may only move from pending to success through this settlement path.
    // A failed/cancelled/unknown state must never be resurrected by a callback.
    if (payment.status !== "pending" && payment.status !== "success") {
      throw new Error("État du paiement incompatible avec une confirmation.");
    }

    if (payment.status !== "success") {
      const updated = await tx
        .update(payments)
        .set({
          confirmedAmount: params.confirmedAmount.toFixed(2),
          providerReference: params.providerReference.trim(),
          status: "success",
          confirmedAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        })
        .where(
          and(
            eq(payments.id, payment.id),
            eq(payments.status, "pending"),
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new Error("Le paiement n'a pas pu être confirmé.");
      }
    } else {
      // Repeated provider callbacks must refer to the same provider transaction.
      if (
        payment.providerReference &&
        payment.providerReference !== params.providerReference.trim()
      ) {
        throw new Error("Référence du prestataire différente pour ce paiement.");
      }
    }

    const finalAmount = params.confirmedAmount;
    const externalId = `payment:${payment.referenceId}`;

    const existingTransaction = await tx
      .select()
      .from(platformTransactions)
      .where(eq(platformTransactions.externalId, externalId))
      .limit(1);

    if (existingTransaction.length > 0) {
      const walletRows = await tx
        .select()
        .from(platformWallet)
        .limit(1);

      if (walletRows.length === 0) {
        throw new Error("Portefeuille réel AfriTok introuvable.");
      }

      return {
        payment: payment,
        transaction: existingTransaction[0],
        wallet: walletRows[0],
        duplicate: true,
      };
    }

    // Lock the single platform wallet before calculating its new balance.
    let walletRows = await tx
      .select()
      .from(platformWallet)
      .limit(1)
      .for("update");

    if (walletRows.length === 0) {
      walletRows = await tx
        .insert(platformWallet)
        .values({
          name: "AfriTok",
          balance: "0",
          totalRevenue: "0",
          totalExpenses: "0",
          currency: payment.currency.toUpperCase(),
        })
        .returning();
    }

    const wallet = walletRows[0];

    if (wallet.currency.toUpperCase() !== payment.currency.toUpperCase()) {
      throw new Error("La devise du paiement ne correspond pas au portefeuille AfriTok.");
    }

    const balanceBefore = Number(wallet.balance);
    const revenueBefore = Number(wallet.totalRevenue);
    if (!Number.isFinite(balanceBefore) || !Number.isFinite(revenueBefore)) {
      throw new Error("Solde du portefeuille réel invalide.");
    }

    const balanceAfter = balanceBefore + finalAmount;
    const totalRevenue = revenueBefore + finalAmount;

    const updatedWalletRows = await tx
      .update(platformWallet)
      .set({
        balance: balanceAfter.toFixed(4),
        totalRevenue: totalRevenue.toFixed(4),
        updatedAt: new Date().toISOString(),
      })
      .where(eq(platformWallet.id, wallet.id))
      .returning();

    const transactionRows = await tx
      .insert(platformTransactions)
      .values({
        userId: payment.userId,
        amount: finalAmount.toFixed(4),
        currency: payment.currency.toUpperCase(),
        direction: "in",
        source: payment.purpose,
        status: "completed",
        paymentProvider: payment.operator,
        paymentReference: payment.referenceId,
        externalId,
        description: `Paiement réel AfriTok confirmé — ${payment.purpose}`,
      })
      .returning();

    return {
      payment: {
        ...payment,
        status: "success",
        confirmedAmount: finalAmount.toFixed(2),
        providerReference: params.providerReference.trim(),
      },
      transaction: transactionRows[0],
      wallet: updatedWalletRows[0],
      balanceBefore,
      balanceAfter,
      duplicate: false,
    };
  });
}
