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
 * actuellement éligibles à la diffusion.
 *
 * IMPORTANT :
 *
 * Les publicités sont séparées du feed vidéo normal.
 *
 * Le frontend pourra demander :
 *
 * "Donne-moi une publicité à afficher."
 *
 * Ce service répond avec une campagne publicitaire.
 */

/**
 * =========================================================
 * 📢 OBTENIR UNE PUBLICITÉ
 * =========================================================
 */

export async function getNextAdvertisement(params?: {
  userId?: number;
  country?: string;
  gender?: string;
  age?: number;
}) {
  const now = new Date().toISOString();

  /**
   * Campagnes actives dont la période est valide.
   */
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

  /**
   * Filtrage du ciblage.
   */
  const eligibleCampaigns = campaigns.filter((campaign) => {
    /**
     * Pays.
     */
    if (
      campaign.targetCountry &&
      params?.country &&
      campaign.targetCountry.toLowerCase() !==
        params.country.toLowerCase()
    ) {
      return false;
    }

    /**
     * Si la campagne cible un pays mais
     * que le pays de l'utilisateur est inconnu,
     * on évite de diffuser.
     */
    if (
      campaign.targetCountry &&
      !params?.country
    ) {
      return false;
    }

    /**
     * Genre.
     */
    if (
      campaign.targetGender &&
      params?.gender &&
      campaign.targetGender.toLowerCase() !==
        params.gender.toLowerCase()
    ) {
      return false;
    }

    /**
     * Âge minimum.
     */
    if (
      campaign.targetAgeMin !== null &&
      campaign.targetAgeMin !== undefined &&
      params?.age !== undefined &&
      params.age < campaign.targetAgeMin
    ) {
      return false;
    }

    /**
     * Âge maximum.
     */
    if (
      campaign.targetAgeMax !== null &&
      campaign.targetAgeMax !== undefined &&
      params?.age !== undefined &&
      params.age > campaign.targetAgeMax
    ) {
      return false;
    }

    /**
     * Si un ciblage d'âge existe mais
     * que l'âge utilisateur est inconnu,
     * on ne diffuse pas.
     */
    if (
      (
        campaign.targetAgeMin !== null ||
        campaign.targetAgeMax !== null
      ) &&
      params?.age === undefined
    ) {
      return false;
    }

    /**
     * Vérifier que le budget n'est pas épuisé.
     */
    if (
      Number(campaign.spentAmount) >=
      Number(campaign.budget)
    ) {
      return false;
    }

    return true;
  });

  if (eligibleCampaigns.length === 0) {
    return null;
  }

  /**
   * Pour commencer :
   *
   * on choisit la campagne ayant
   * le moins d'impressions.
   *
   * Cela évite qu'une seule campagne
   * monopolise toute la diffusion.
   */
  eligibleCampaigns.sort(
    (a, b) =>
      a.impressions - b.impressions
  );

  const campaign =
    eligibleCampaigns[0];

  return {
    id: campaign.id,

    advertiserId:
      campaign.advertiserId,

    advertiserName:
      campaign.advertiserName,

    name:
      campaign.name,

    adType:
      campaign.adType,

    textContent:
      campaign.textContent,

    imageUrl:
      campaign.imageUrl,

    videoUrl:
      campaign.videoUrl,

    destinationUrl:
      campaign.destinationUrl,

    campaignId:
      campaign.id,
  };
}

/**
 * =========================================================
 * 📊 INFORMATIONS DE DIFFUSION
 * =========================================================
 */

export async function getAdvertisingCampaign(
  campaignId: number
) {
  const result = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      eq(
        advertisingCampaigns.id,
        campaignId
      )
    )
    .limit(1);

  return result[0] ?? null;
}