import { db } from "../db";
import {
  advertisingCampaigns,
  advertisingEvents,
} from "../../drizzle/schema-advertising";
import { eq, and, sql } from "drizzle-orm";

/**
 * =========================================================
 * 📊 AFRITOK — AD EVENTS SERVICE
 * =========================================================
 *
 * Enregistre les événements publicitaires.
 *
 * Événements supportés :
 *
 * - impression
 * - click
 *
 * Les statistiques publicitaires restent totalement
 * séparées des vues, likes et commentaires des vidéos.
 */

/**
 * =========================================================
 * 👁️ ENREGISTRER UNE IMPRESSION
 * =========================================================
 */

export async function recordAdImpression(params: {
  campaignId: number;
  userId?: number;
}) {
  return await db.transaction(async (tx) => {
    const campaign = await tx
      .select()
      .from(advertisingCampaigns)
      .where(
        eq(
          advertisingCampaigns.id,
          params.campaignId
        )
      )
      .limit(1);

    if (campaign.length === 0) {
      throw new Error(
        "Campagne publicitaire introuvable."
      );
    }

    if (campaign[0].status !== "active") {
      throw new Error(
        "Cette campagne n'est pas active."
      );
    }

    const eventReference =
      `imp_${params.campaignId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    await tx
      .insert(advertisingEvents)
      .values({
        campaignId: params.campaignId,
        userId: params.userId,
        eventType: "impression",
        chargedAmount: "0",
        eventReference,
      });

    await tx
      .update(advertisingCampaigns)
      .set({
        impressions:
          sql`${advertisingCampaigns.impressions} + 1`,
        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          advertisingCampaigns.id,
          params.campaignId
        )
      );

    return {
      success: true,
      eventType: "impression",
      eventReference,
    };
  });
}

/**
 * =========================================================
 * 🖱️ ENREGISTRER UN CLIC
 * =========================================================
 */

export async function recordAdClick(params: {
  campaignId: number;
  userId?: number;
}) {
  return await db.transaction(async (tx) => {
    const campaign = await tx
      .select()
      .from(advertisingCampaigns)
      .where(
        eq(
          advertisingCampaigns.id,
          params.campaignId
        )
      )
      .limit(1);

    if (campaign.length === 0) {
      throw new Error(
        "Campagne publicitaire introuvable."
      );
    }

    if (campaign[0].status !== "active") {
      throw new Error(
        "Cette campagne n'est pas active."
      );
    }

    const eventReference =
      `click_${params.campaignId}_${Date.now()}_${Math.random()
        .toString(36)
        .slice(2, 10)}`;

    await tx
      .insert(advertisingEvents)
      .values({
        campaignId: params.campaignId,
        userId: params.userId,
        eventType: "click",
        chargedAmount: "0",
        eventReference,
      });

    await tx
      .update(advertisingCampaigns)
      .set({
        clicks:
          sql`${advertisingCampaigns.clicks} + 1`,
        updatedAt:
          new Date().toISOString(),
      })
      .where(
        eq(
          advertisingCampaigns.id,
          params.campaignId
        )
      );

    return {
      success: true,
      eventType: "click",
      eventReference,
    };
  });
}

/**
 * =========================================================
 * 📈 STATISTIQUES D'UNE CAMPAGNE
 * =========================================================
 */

export async function getAdStatistics(
  campaignId: number
) {
  const campaign = await db
    .select()
    .from(advertisingCampaigns)
    .where(
      eq(
        advertisingCampaigns.id,
        campaignId
      )
    )
    .limit(1);

  if (campaign.length === 0) {
    throw new Error(
      "Campagne publicitaire introuvable."
    );
  }

  const data = campaign[0];

  const impressions =
    Number(data.impressions || 0);

  const clicks =
    Number(data.clicks || 0);

  const ctr =
    impressions > 0
      ? (clicks / impressions) * 100
      : 0;

  return {
    campaignId: data.id,

    impressions,

    clicks,

    ctr: Number(
      ctr.toFixed(2)
    ),

    budget: Number(
      data.budget
    ),

    spentAmount: Number(
      data.spentAmount
    ),

    remainingBudget:
      Math.max(
        0,
        Number(data.budget) -
          Number(data.spentAmount)
      ),

    status:
      data.status,
  };
}