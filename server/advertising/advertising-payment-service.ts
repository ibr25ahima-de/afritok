import { db } from "../db";
import {
  advertisingCampaigns,
} from "../../drizzle/schema-advertising";
import {
  eq,
} from "drizzle-orm";

/**
 * =========================================================
 * 💳 AFRITOK — ADVERTISING PAYMENT SERVICE
 * =========================================================
 *
 * Ce service intervient uniquement après confirmation
 * réelle d'un paiement.
 *
 * Flux :
 *
 * Paiement réel confirmé
 *        ↓
 * purpose = advertisement
 *        ↓
 * référence de paiement
 *        ↓
 * campagne publicitaire
 *        ↓
 * campagne activée
 *
 * IMPORTANT :
 *
 * Ce fichier ne confirme jamais un paiement.
 * Il reçoit uniquement une confirmation déjà validée
 * par le système de paiement.
 */

/**
 * =========================================================
 * 🔎 TROUVER LA CAMPAGNE PAR RÉFÉRENCE DE PAIEMENT
 * =========================================================
 */

export async function getCampaignByPaymentReference(
  paymentReference: string
) {
  const result = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      eq(
        advertisingCampaigns.paymentReference,
        paymentReference
      )
    )
    .limit(1);

  return result[0] ?? null;
}

/**
 * =========================================================
 * 💰 ENREGISTRER LE PAIEMENT CONFIRMÉ
 * =========================================================
 */

export async function confirmAdvertisingPayment(params: {
  paymentReference: string;
  confirmedAmount: number;
}) {
  if (
    !params.paymentReference ||
    params.paymentReference.trim().length === 0
  ) {
    throw new Error(
      "Référence de paiement manquante."
    );
  }

  if (params.confirmedAmount <= 0) {
    throw new Error(
      "Montant confirmé invalide."
    );
  }

  return await db.transaction(async (tx) => {
    const campaignResult = await tx
      .select()
      .from(advertisingCampaigns)
      .where(
        eq(
          advertisingCampaigns.paymentReference,
          params.paymentReference
        )
      )
      .limit(1);

    if (campaignResult.length === 0) {
      throw new Error(
        "Aucune campagne publicitaire liée à ce paiement."
      );
    }

    const campaign =
      campaignResult[0];

    /**
     * Protection contre un double traitement.
     */
    if (
      campaign.status === "active" ||
      campaign.status === "completed"
    ) {
      return {
        success: true,
        duplicate: true,
        campaign,
      };
    }

    /**
     * Vérifier que le montant payé couvre
     * le budget de la campagne.
     */
    const budget =
      Number(campaign.budget);

    if (
      params.confirmedAmount < budget
    ) {
      throw new Error(
        "Le paiement confirmé est inférieur au budget publicitaire."
      );
    }

    /**
     * Le montant payé devient le montant dépensable
     * de la campagne.
     *
     * Le solde réel de la plateforme a déjà été crédité
     * par le système de settlement.
     */
    const updated =
      await tx
        .update(advertisingCampaigns)
        .set({
          spentAmount: "0",

          status: "active",

          updatedAt:
            new Date().toISOString(),
        })
        .where(
          eq(
            advertisingCampaigns.id,
            campaign.id
          )
        )
        .returning();

    return {
      success: true,
      duplicate: false,
      campaign:
        updated[0],
    };
  });
}