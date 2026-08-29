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
    const paymentRows = await tx
      .select()
      .from(payments)
      .where(eq(payments.referenceId, params.referenceId))
      .limit(1);

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
            eq(payments.status, payment.status),
          )
        )
        .returning();

      if (updated.length === 0) {
        throw new Error("Le paiement n'a pas pu être confirmé.");
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

    let walletRows = await tx
      .select()
      .from(platformWallet)
      .limit(1);

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
    const balanceAfter = balanceBefore + finalAmount;
    const totalRevenue = Number(wallet.totalRevenue) + finalAmount;

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
