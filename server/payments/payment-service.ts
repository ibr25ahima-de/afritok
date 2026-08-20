import { db } from "../db";
import { payments } from "../../drizzle/schema-payments";
import { eq } from "drizzle-orm";

export async function createPaymentTransaction({
  userId,
  amount,
  currency,
  operator,
  phone,
  purpose,
  referenceId,
}: {
  userId: number;
  amount: number;
  currency: string;
  operator: string;
  phone?: string;
  purpose: string;
  referenceId: string;
}) {
  if (!userId) {
    throw new Error("Utilisateur invalide.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Montant invalide.");
  }

  if (!operator) {
    throw new Error("Opérateur de paiement invalide.");
  }

  if (!purpose) {
    throw new Error("Motif du paiement invalide.");
  }

  if (!referenceId) {
    throw new Error("Référence de paiement invalide.");
  }

  const existing = await db
    .select()
    .from(payments)
    .where(eq(payments.referenceId, referenceId))
    .limit(1);

  if (existing.length > 0) {
    return existing[0];
  }

  const result = await db
    .insert(payments)
    .values({
      userId,
      amount: amount.toFixed(2),
      confirmedAmount: "0",
      currency,
      operator,
      phone: phone ?? null,
      purpose,
      referenceId,
      providerReference: null,
      status: "pending",
      confirmedAt: null,
    })
    .returning();

  return result[0];
}


/**
 * Confirme un paiement après confirmation
 * réelle du prestataire.
 */
export async function confirmPayment({
  referenceId,
  providerReference,
  confirmedAmount,
}: {
  referenceId: string;
  providerReference: string;
  confirmedAmount: number;
}) {
  if (!referenceId) {
    throw new Error("Référence interne manquante.");
  }

  if (!providerReference) {
    throw new Error("Référence du prestataire manquante.");
  }

  if (
    !Number.isFinite(confirmedAmount) ||
    confirmedAmount <= 0
  ) {
    throw new Error("Montant confirmé invalide.");
  }

  const existing = await db
    .select()
    .from(payments)
    .where(eq(payments.referenceId, referenceId))
    .limit(1);

  if (existing.length === 0) {
    throw new Error(
      "Transaction de paiement introuvable."
    );
  }

  const payment = existing[0];

  if (payment.status === "success") {
    return payment;
  }

  const result = await db
    .update(payments)
    .set({
      confirmedAmount:
        confirmedAmount.toFixed(2),

      providerReference,

      status: "success",

      confirmedAt:
        new Date().toISOString(),

      updatedAt:
        new Date().toISOString(),
    })
    .where(
      eq(
        payments.referenceId,
        referenceId
      )
    )
    .returning();

  return result[0];
}


/**
 * Marque un paiement comme échoué.
 */
export async function failPayment({
  referenceId,
}: {
  referenceId: string;
}) {
  if (!referenceId) {
    throw new Error("Référence de paiement manquante.");
  }

  const result = await db
    .update(payments)
    .set({
      status: "failed",
      updatedAt: new Date().toISOString(),
    })
    .where(
      eq(
        payments.referenceId,
        referenceId
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "Transaction de paiement introuvable."
    );
  }

  return result[0];
}
