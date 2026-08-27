import { db } from "../db";
import {
  advertisingCampaigns,
} from "../../drizzle/schema-advertising";
import { and, eq, sql } from "drizzle-orm";
import { verifyAdvertisingPayment } from "./advertising-payment-security-service";

/**
 * =========================================================
 * 📢 AFRITOK — ADVERTISING SERVICE
 * =========================================================
 *
 * Logique métier du système publicitaire.
 *
 * IMPORTANT :
 * Les paiements réels ne sont PAS gérés directement ici.
 * Leur confirmation est vérifiée par
 * advertising-payment-security-service.ts.
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
    throw new Error("La date de fin doit être supérieure à la date de début.");
  }

  if (params.adType === "text" && !params.textContent?.trim()) {
    throw new Error("Une publicité texte doit contenir un texte.");
  }

  if (params.adType === "image" && !params.imageUrl?.trim()) {
    throw new Error("Une publicité image doit contenir une image.");
  }

  if (params.adType === "video" && !params.videoUrl?.trim()) {
    throw new Error("Une publicité vidéo doit contenir une vidéo.");
  }

  if (
    params.targetAgeMin !== undefined &&
    params.targetAgeMax !== undefined &&
    params.targetAgeMin > params.targetAgeMax
  ) {
    throw new Error("L'âge minimum ne peut pas être supérieur à l'âge maximum.");
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

export async function attachAdvertisingPayment(
  campaignId: number,
  paymentReference: string
) {
  if (!paymentReference.trim()) {
    throw new Error("La référence du paiement est obligatoire.");
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
    throw new Error("Campagne publicitaire introuvable ou impossible à modifier.");
  }

  return result[0];
}

/**
 * Activation protégée : un paiement réellement confirmé,
 * du bon utilisateur, du bon motif, montant et devise est requis.
 */
export async function activateAdvertisingCampaign(campaignId: number) {
  const campaign = await db
    .select()
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  if (campaign.length === 0) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  const currentCampaign = campaign[0];

  if (currentCampaign.status !== "pending_payment") {
    throw new Error(
      "La campagne doit être en attente de paiement avant son activation."
    );
  }

  await verifyAdvertisingPayment(campaignId);

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
    throw new Error("La campagne ne peut pas être activée.");
  }

  return result[0];
}

export async function pauseAdvertisingCampaign(campaignId: number) {
  const result = await db
    .update(advertisingCampaigns)
    .set({ status: "paused", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.status, "active")
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Campagne active introuvable.");
  }

  return result[0];
}

export async function resumeAdvertisingCampaign(campaignId: number) {
  const result = await db
    .update(advertisingCampaigns)
    .set({ status: "active", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.status, "paused")
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("Campagne en pause introuvable.");
  }

  return result[0];
}

export async function cancelAdvertisingCampaign(campaignId: number) {
  const result = await db
    .update(advertisingCampaigns)
    .set({ status: "cancelled", updatedAt: new Date().toISOString() })
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        sql`${advertisingCampaigns.status} NOT IN ('completed', 'cancelled')`
      )
    )
    .returning();

  if (result.length === 0) {
    throw new Error("La campagne ne peut pas être annulée.");
  }

  return result[0];
}
