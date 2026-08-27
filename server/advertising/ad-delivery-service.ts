import { db } from "../db";
import {
  advertisingCampaigns,
} from "../../drizzle/schema-advertising";
import { and, eq, lte, gte } from "drizzle-orm";

/**
 * =========================================================
 * 📢 AFRITOK — AD DELIVERY SERVICE
 * =========================================================
 *
 * Sélectionne uniquement les campagnes publicitaires
 * actuellement autorisées à être diffusées.
 *
 * IMPORTANT :
 * - séparé du feed vidéo normal ;
 * - une campagne doit être active ;
 * - la période doit être valide ;
 * - le budget ne doit pas être épuisé ;
 * - tout ciblage défini doit être vérifiable avant diffusion.
 */

export async function getNextAdvertisement(params?: {
  userId?: number;
  country?: string;
  gender?: string;
  age?: number;
}) {
  const now = new Date().toISOString();

  // Une diffusion personnalisée doit toujours avoir un utilisateur connecté.
  if (!params?.userId) {
    return null;
  }

  const campaigns = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      and(
        eq(advertisingCampaigns.status, "active"),
        lte(advertisingCampaigns.startDate, now),
        gte(advertisingCampaigns.endDate, now)
      )
    )
    .limit(50);

  if (campaigns.length === 0) {
    return null;
  }

  const eligibleCampaigns = campaigns.filter((campaign) => {
    // Ne jamais diffuser une campagne dont le budget est épuisé.
    if (Number(campaign.spentAmount) >= Number(campaign.budget)) {
      return false;
    }

    // Pays : si ciblé, le pays de l'utilisateur est obligatoire et doit correspondre.
    if (campaign.targetCountry) {
      if (!params.country) return false;
      if (
        campaign.targetCountry.trim().toLowerCase() !==
        params.country.trim().toLowerCase()
      ) {
        return false;
      }
    }

    // Genre : même règle stricte que pour le pays.
    if (campaign.targetGender) {
      if (!params.gender) return false;
      if (
        campaign.targetGender.trim().toLowerCase() !==
        params.gender.trim().toLowerCase()
      ) {
        return false;
      }
    }

    // Âge minimum : impossible de vérifier le ciblage sans âge.
    if (campaign.targetAgeMin !== null && campaign.targetAgeMin !== undefined) {
      if (params.age === undefined) return false;
      if (params.age < campaign.targetAgeMin) return false;
    }

    // Âge maximum : impossible de vérifier le ciblage sans âge.
    if (campaign.targetAgeMax !== null && campaign.targetAgeMax !== undefined) {
      if (params.age === undefined) return false;
      if (params.age > campaign.targetAgeMax) return false;
    }

    return true;
  });

  if (eligibleCampaigns.length === 0) {
    return null;
  }

  /**
   * Distribution simple et équilibrée :
   * priorité aux campagnes ayant le moins d'impressions.
   */
  eligibleCampaigns.sort((a, b) => a.impressions - b.impressions);

  const campaign = eligibleCampaigns[0];

  return {
    id: campaign.id,
    advertiserId: campaign.advertiserId,
    advertiserName: campaign.advertiserName,
    name: campaign.name,
    adType: campaign.adType,
    textContent: campaign.textContent,
    imageUrl: campaign.imageUrl,
    videoUrl: campaign.videoUrl,
    destinationUrl: campaign.destinationUrl,
    campaignId: campaign.id,
  };
}

/**
 * =========================================================
 * 📊 INFORMATIONS DE DIFFUSION
 * =========================================================
 */

export async function getAdvertisingCampaign(campaignId: number) {
  const result = await db
    .select()
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  return result[0] ?? null;
}
