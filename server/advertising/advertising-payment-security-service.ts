import { db } from "../db";
import { advertisingCampaigns } from "../../drizzle/schema-advertising";
import { payments } from "../../drizzle/schema-payments";
import { and, eq } from "drizzle-orm";

/**
 * =========================================================
 * 🔐 AFRITOK — SÉCURITÉ PAIEMENT PUBLICITAIRE
 * =========================================================
 *
 * Vérifie qu'une campagne ne peut être activée que si son
 * paiement réel a été confirmé par le système de paiements.
 *
 * Cette fonction ne confirme jamais un paiement elle-même.
 */
export async function verifyAdvertisingPayment(
  campaignId: number
) {
  const campaignResult = await db
    .select()
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  if (campaignResult.length === 0) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  const campaign = campaignResult[0];

  if (!campaign.paymentReference) {
    throw new Error(
      "Impossible d'activer la campagne : aucun paiement n'est associé."
    );
  }

  const paymentResult = await db
    .select()
    .from(payments)
    .where(eq(payments.referenceId, campaign.paymentReference))
    .limit(1);

  if (paymentResult.length === 0) {
    throw new Error(
      "Paiement publicitaire introuvable dans le système des paiements réels."
    );
  }

  const payment = paymentResult[0];

  if (payment.userId !== campaign.advertiserId) {
    throw new Error(
      "Le paiement utilisé n'appartient pas à l'annonceur de cette campagne."
    );
  }

  if (payment.purpose !== "advertisement") {
    throw new Error(
      "Ce paiement n'est pas identifié comme un paiement publicitaire."
    );
  }

  if (payment.status !== "success") {
    throw new Error(
      "Paiement non confirmé. La campagne ne peut pas être activée."
    );
  }

  const confirmedAmount = Number(payment.confirmedAmount);
  const campaignBudget = Number(campaign.budget);

  if (!Number.isFinite(confirmedAmount) || confirmedAmount <= 0) {
    throw new Error(
      "Le montant confirmé du paiement publicitaire est invalide."
    );
  }

  if (Math.abs(confirmedAmount - campaignBudget) > 0.001) {
    throw new Error(
      "Le montant payé ne correspond pas au budget de la campagne."
    );
  }

  if (
    payment.currency.toUpperCase() !==
    campaign.currency.toUpperCase()
  ) {
    throw new Error(
      "La devise du paiement ne correspond pas à celle de la campagne."
    );
  }

  return {
    verified: true,
    campaignId: campaign.id,
    paymentId: payment.id,
    referenceId: payment.referenceId,
    providerReference: payment.providerReference,
    confirmedAmount,
    currency: payment.currency,
  };
}
