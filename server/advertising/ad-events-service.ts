import { db } from "../db";
import {
  advertisingCampaigns,
  advertisingEvents,
} from "../../drizzle/schema-advertising";
import { and, eq, gt, sql } from "drizzle-orm";

const IMPRESSION_COOLDOWN_MS = 30_000;
const CLICK_COOLDOWN_MS = 30_000;

function eventSince(eventType: "impression" | "click") {
  return new Date(
    Date.now() -
      (eventType === "impression"
        ? IMPRESSION_COOLDOWN_MS
        : CLICK_COOLDOWN_MS)
  ).toISOString();
}

/**
 * Crée une référence déterministe par fenêtre de cooldown.
 *
 * Cela ajoute une deuxième protection contre les doubles requêtes
 * concurrentes : deux requêtes identiques dans la même fenêtre
 * produisent la même référence unique en base.
 */
function buildEventReference(
  campaignId: number,
  userId: number,
  eventType: "impression" | "click"
) {
  const cooldown =
    eventType === "impression"
      ? IMPRESSION_COOLDOWN_MS
      : CLICK_COOLDOWN_MS;

  const bucket = Math.floor(Date.now() / cooldown);

  return `${eventType}_${campaignId}_${userId}_${bucket}`;
}

async function assertCampaignCanReceiveEvent(
  tx: typeof db,
  campaignId: number,
  userId: number,
  eventType: "impression" | "click"
) {
  const campaign = await tx
    .select({
      id: advertisingCampaigns.id,
      status: advertisingCampaigns.status,
      budget: advertisingCampaigns.budget,
      spentAmount: advertisingCampaigns.spentAmount,
    })
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  if (campaign.length === 0) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  if (campaign[0].status !== "active") {
    throw new Error("Cette campagne n'est pas active.");
  }

  if (Number(campaign[0].spentAmount) >= Number(campaign[0].budget)) {
    throw new Error("Le budget de cette campagne est épuisé.");
  }

  const recent = await tx
    .select({ id: advertisingEvents.id })
    .from(advertisingEvents)
    .where(
      and(
        eq(advertisingEvents.campaignId, campaignId),
        eq(advertisingEvents.userId, userId),
        eq(advertisingEvents.eventType, eventType),
        gt(advertisingEvents.createdAt, eventSince(eventType))
      )
    )
    .limit(1);

  if (recent.length > 0) {
    throw new Error(
      "Cet événement publicitaire a déjà été enregistré récemment."
    );
  }
}

export async function recordAdImpression(params: {
  campaignId: number;
  userId?: number;
}) {
  if (!params.userId) {
    throw new Error(
      "Utilisateur requis pour enregistrer une impression publicitaire."
    );
  }

  return db.transaction(async (tx) => {
    await assertCampaignCanReceiveEvent(
      tx,
      params.campaignId,
      params.userId!,
      "impression"
    );

    const eventReference = buildEventReference(
      params.campaignId,
      params.userId!,
      "impression"
    );

    await tx.insert(advertisingEvents).values({
      campaignId: params.campaignId,
      userId: params.userId,
      eventType: "impression",
      chargedAmount: "0",
      eventReference,
    });

    await tx
      .update(advertisingCampaigns)
      .set({
        impressions: sql`${advertisingCampaigns.impressions} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(advertisingCampaigns.id, params.campaignId),
          eq(advertisingCampaigns.status, "active")
        )
      );

    return {
      success: true,
      eventType: "impression",
      eventReference,
    };
  });
}

export async function recordAdClick(params: {
  campaignId: number;
  userId?: number;
}) {
  if (!params.userId) {
    throw new Error(
      "Utilisateur requis pour enregistrer un clic publicitaire."
    );
  }

  return db.transaction(async (tx) => {
    await assertCampaignCanReceiveEvent(
      tx,
      params.campaignId,
      params.userId!,
      "click"
    );

    const eventReference = buildEventReference(
      params.campaignId,
      params.userId!,
      "click"
    );

    await tx.insert(advertisingEvents).values({
      campaignId: params.campaignId,
      userId: params.userId,
      eventType: "click",
      chargedAmount: "0",
      eventReference,
    });

    await tx
      .update(advertisingCampaigns)
      .set({
        clicks: sql`${advertisingCampaigns.clicks} + 1`,
        updatedAt: new Date().toISOString(),
      })
      .where(
        and(
          eq(advertisingCampaigns.id, params.campaignId),
          eq(advertisingCampaigns.status, "active")
        )
      );

    return {
      success: true,
      eventType: "click",
      eventReference,
    };
  });
}

export async function getAdStatistics(campaignId: number) {
  const campaign = await db
    .select()
    .from(advertisingCampaigns)
    .where(eq(advertisingCampaigns.id, campaignId))
    .limit(1);

  if (campaign.length === 0) {
    throw new Error("Campagne publicitaire introuvable.");
  }

  const data = campaign[0];
  const impressions = Number(data.impressions || 0);
  const clicks = Number(data.clicks || 0);
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;

  return {
    campaignId: data.id,
    impressions,
    clicks,
    ctr: Number(ctr.toFixed(2)),
    budget: Number(data.budget),
    spentAmount: Number(data.spentAmount),
    remainingBudget: Math.max(
      0,
      Number(data.budget) - Number(data.spentAmount)
    ),
    status: data.status,
  };
}
