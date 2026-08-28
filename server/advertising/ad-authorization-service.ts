import { db } from "../db";
import { advertisingCampaigns } from "../../drizzle/schema-advertising";
import { eq } from "drizzle-orm";

/**
 * =========================================================
 * 🔐 AFRITOK — ADVERTISING AUTHORIZATION SERVICE
 * =========================================================
 *
 * Centralise les contrôles d'accès aux campagnes publicitaires.
 *
 * Règle : un annonceur ne peut consulter ou modifier que ses
 * propres campagnes.
 *
 * Ce service ne confirme jamais un paiement.
 */

export async function assertAdvertisingCampaignOwner(
  campaignId: number,
  userId: number
) {
  const result = await db
    .select({
      id: advertisingCampaigns.id,
      advertiserId: advertisingCampaigns.advertiserId,
    })
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  const campaign = result[0];

  if (!campaign) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  if (campaign.advertiserId !== userId) {
    throw new Error(
      "Accès refusé : cette campagne publicitaire ne vous appartient pas."
    );
  }

  return campaign;
}
