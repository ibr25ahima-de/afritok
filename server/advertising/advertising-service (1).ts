import { db } from "../db";
import {
  advertisingCampaigns,
} from "../../drizzle/schema-advertising";
import { eq, and, sql } from "drizzle-orm";

/**
 * =========================================================
 * 📢 AFRITOK — ADVERTISING SERVICE
 * =========================================================
 *
 * Logique métier du système publicitaire.
 *
 * Ce fichier ne gère PAS directement les paiements.
 *
 * Le paiement réel reste géré par :
 * - schema-payments.ts
 * - payment-settlement.ts
 *
 * Ici nous gérons :
 * - création des campagnes
 * - activation
 * - pause
 * - annulation
 * - diffusion
 * - impressions
 * - clics
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
    throw new Error("Le budget publicitaire doit être supérieur à 0.");
  }

  if (params.endDate <= params.startDate) {
    throw new Error(
      "La date de fin doit être supérieure à la date de début."
    );
  }

  if (params.adType === "text" && !params.textContent) {
    throw new Error(
      "Une publicité texte doit contenir un texte."
    );
  }

  if (params.adType === "image" && !params.imageUrl) {
    throw new Error(
      "Une publicité image doit contenir une image."
    );
  }

  if (params.adType === "video" && !params.videoUrl) {
    throw new Error(
      "Une publicité vidéo doit contenir une vidéo."
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

      currency: params.currency || "XOF",

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
 */

export async function attachAdvertisingPayment(
  campaignId: number,
  paymentReference: string
) {
  const result = await db
    .update(advertisingCampaigns)
    .set({
      paymentReference,
      status: "pending_payment",
      updatedAt: new Date().toISOString(),
    })
    .where(eq(advertisingCampaigns.id, campaignId))
    .returning();

  if (result.length === 0) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  return result[0];
}

/**
 * =========================================================
 * ✅ ACTIVER APRÈS CONFIRMATION DU PAIEMENT
 * =========================================================
 */

export async function activateAdvertisingCampaign(
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

