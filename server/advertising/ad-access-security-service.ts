import { db } from "../db";
import { advertisingCampaigns } from "../../drizzle/schema-advertising";
import { and, eq } from "drizzle-orm";

/**
 * =========================================================
 * 🔐 AFRITOK — AD ACCESS SECURITY
 * =========================================================
 *
 * Centralise les contrôles d'accès aux campagnes publicitaires.
 *
 * Un annonceur ne peut consulter ou modifier que ses propres
 * campagnes. La diffusion publique et les événements sont gérés
 * par leurs services dédiés.
 */

export async function getOwnedAdvertisingCampaign(
  campaignId: number,
  advertiserId: number
) {
  const result = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      and(
        eq(advertisingCampaigns.id, campaignId),
        eq(advertisingCampaigns.advertiserId, advertiserId)
      )
    )
    .limit(1);

  if (result.length === 0) {
    throw new Error(
      "Campagne introuvable ou vous n'êtes pas autorisé à y accéder."
    );
  }

  return result[0];
}
