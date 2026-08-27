import { db } from "../db";
import {
  advertisingCampaigns,
} from "../../drizzle/schema-advertising";
import { and, eq, sql } from "drizzle-orm";

/**
 * =========================================================
 * 📢 AFRITOK — ADVERTISING SERVICE
 * =========================================================
 *
 * Logique métier du système publicitaire.
 *
 * IMPORTANT :
 *
 * Les paiements réels ne sont PAS gérés directement ici.
 *
 * Ce service gère :
 * - création des campagnes
 * - liaison d'une référence de paiement
 * - activation
 * - pause
 * - reprise
 * - annulation
 *
 * Les événements publicitaires :
 * - impressions
 * - clics
 *
 * sont gérés dans :
 *
 * server/advertising/ad-events-service.ts
 *
 * La diffusion est gérée dans :
 *
 * server/advertising/ad-delivery-service.ts
 */

/**
 * =========================================================
 * 📢 CRÉER UNE CAMPAGNE
 * =========================================================
 */

export async function createAdvertisingCampaign(params: {
  advertiserId: number;
  advertiserName: string;
  name: string;
  adType: "text" | "image" | "video";

  textContent?: string;
  imageUrl?: string;
  videoUrl?: string;
  destinationUrl?: string;

  budget: number;
  currency?: string;

  startDate: Date;
  endDate: Date;

  targetCountry?: string;
  targetGender?: string;
  targetAgeMin?: number;
  targetAgeMax?: number;
}) {
  if (params.budget <= 0) {
    throw new Error(
      "Le budget publicitaire doit être supérieur à 0."
    );
  }

  if (params.endDate <= params.startDate) {
    throw new Error(
      "La date de fin doit être supérieure à la date de début."
    );
  }

  if (params.adType === "text" && !params.textContent?.trim()) {
    throw new Error(
      "Une publicité texte doit contenir un texte."
    );
  }

  if (params.adType === "image" && !params.imageUrl?.trim()) {
    throw new Error(
      "Une publicité image doit contenir une image."
    );
  }

  if (params.adType === "video" && !params.videoUrl?.trim()) {
    throw new Error(
      "Une publicité vidéo doit contenir une vidéo."
    );
  }

  if (
    params.targetAgeMin !== undefined &&
    params.targetAgeMax !== undefined &&
    params.targetAgeMin > params.targetAgeMax
  ) {
    throw new Error(
      "L'âge minimum ne peut pas être supérieur à l'âge maximum."
    );
  }

  const result = await db
    .insert(advertisingCampaigns)
    .values({
      advertiserId: params.advertiserId,
      advertiserName: params.advertiserName,
      name: params.name,

      adType: params.adType,

      textContent: params.textContent,
      imageUrl: params.imageUrl,
      videoUrl: params.videoUrl,
      destinationUrl: params.destinationUrl,

      budget: params.budget.toFixed(2),
      spentAmount: "0",

      currency: (params.currency || "XOF").toUpperCase(),

      startDate: params.startDate.toISOString(),
      endDate: params.endDate.toISOString(),

      status: "draft",

      targetCountry: params.targetCountry,
      targetGender: params.targetGender,
      targetAgeMin: params.targetAgeMin,
      targetAgeMax: params.targetAgeMax,
    })
    .returning();

  return result[0];
}

/**
 * =========================================================
 * 💳 LIER LE PAIEMENT À LA CAMPAGNE
 * =========================================================
 *
 * Cette fonction ne confirme PAS le paiement.
 *
 * Elle enregistre uniquement la référence.
 *
 * La confirmation réelle doit venir du système
 * de paiement / settlement.
 */

export async function attachAdvertisingPayment(
  campaignId: number,
  paymentReference: string
) {
  if (!paymentReference.trim()) {
    throw new Error(
      "La référence du paiement est obligatoire."
    );
  }

  const result = await db
    .update(advertisingCampaigns)
    .set({
      paymentReference: paymentReference.trim(),
      status: "pending_payment",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        sql`${advertisingCampaigns.status} NOT IN ('completed', 'cancelled')`
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "Campagne publicitaire introuvable ou impossible à modifier."
    );
  }

  return result[0];
}

/**
 * =========================================================
 * ✅ ACTIVER UNE CAMPAGNE
 * =========================================================
 *
 * IMPORTANT :
 *
 * Cette fonction suppose que le système de paiement
 * a déjà confirmé le paiement avant son appel.
 *
 * Elle refuse :
 * - une campagne sans référence de paiement
 * - une campagne qui n'est pas pending_payment
 */

export async function activateAdvertisingCampaign(
  campaignId: number
) {
  const campaign = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      eq(advertisingCampaigns.id, campaignId)
    )
    .limit(1);

  if (campaign.length === 0) {
    throw new Error(
      "Campagne publicitaire introuvable."
    );
  }

  const currentCampaign = campaign[0];

  if (currentCampaign.status !== "pending_payment") {
    throw new Error(
      "La campagne doit être en attente de paiement avant son activation."
    );
  }

  if (!currentCampaign.paymentReference) {
    throw new Error(
      "Impossible d'activer la campagne : aucun paiement n'est associé."
    );
  }

  const result = await db
    .update(advertisingCampaigns)
    .set({
      status: "active",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.status, "pending_payment")
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "La campagne ne peut pas être activée."
    );
  }

  return result[0];
}

/**
 * =========================================================
 * ⏸️ METTRE EN PAUSE
 * =========================================================
 */

export async function pauseAdvertisingCampaign(
  campaignId: number
) {
  const result = await db
    .update(advertisingCampaigns)
    .set({
      status: "paused",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.status, "active")
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "Campagne active introuvable."
    );
  }

  return result[0];
}

/**
 * =========================================================
 * ▶️ REPRENDRE UNE CAMPAGNE
 * =========================================================
 */

export async function resumeAdvertisingCampaign(
  campaignId: number
) {
  const result = await db
    .update(advertisingCampaigns)
    .set({
      status: "active",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.status, "paused")
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "Campagne en pause introuvable."
    );
  }

  return result[0];
}

/**
 * =========================================================
 * ❌ ANNULER UNE CAMPAGNE
 * =========================================================
 */

export async function cancelAdvertisingCampaign(
  campaignId: number
) {
  const result = await db
    .update(advertisingCampaigns)
    .set({
      status: "cancelled",
      updatedAt: new Date().toISOString(),
    })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        sql`${advertisingCampaigns.status} NOT IN ('completed', 'cancelled')`
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error(
      "La campagne ne peut pas être annulée."
    );
  }

  return result[0];
}
