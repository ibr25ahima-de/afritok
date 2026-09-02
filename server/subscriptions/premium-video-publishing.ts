import { TRPCError } from "@trpc/server";
import { db } from "../db";
import { videos } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { getActivePremiumSubscription } from "./subscription-service";
import { queuePremiumHdVideo } from "../video-worker/premium-hd-trigger";

export type PremiumVideoOptions = {
  quality?: "standard" | "hd";
  scheduledAt?: string | null;
  commentsMode?: "all" | "followers" | "off";
};

export async function assertPremiumVideoOptions(userId: number, options: PremiumVideoOptions) {
  const hasPremiumOption = options.quality === "hd" || Boolean(options.scheduledAt) || options.commentsMode === "followers" || options.commentsMode === "off";
  if (!hasPremiumOption) return;
  const subscription = await getActivePremiumSubscription(userId);
  if (!subscription) throw new TRPCError({ code: "FORBIDDEN", message: "Cette option vidéo est réservée aux abonnés Premium actifs." });
}

export async function applyPremiumVideoOptions(userId: number, videoId: number, options: PremiumVideoOptions) {
  await assertPremiumVideoOptions(userId, options);
  const scheduledAt = options.scheduledAt ? new Date(options.scheduledAt) : null;
  if (options.scheduledAt && Number.isNaN(scheduledAt!.getTime())) throw new TRPCError({ code: "BAD_REQUEST", message: "Date de publication invalide." });

  const [video] = await db.select().from(videos).where(eq(videos.id, videoId)).limit(1);
  if (!video || video.userId !== userId) throw new TRPCError({ code: "NOT_FOUND", message: "Vidéo introuvable." });

  await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "premiumQuality" text`);
  await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "scheduledAt" timestamp`);
  await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "commentsMode" text`);
  await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "hdVideoUrl" text`);
  await db.execute(sql`UPDATE "videos" SET "premiumQuality" = ${options.quality ?? "standard"}, "scheduledAt" = ${scheduledAt?.toISOString() ?? null}, "commentsMode" = ${options.commentsMode ?? "all"} WHERE "id" = ${videoId}`);

  if (options.quality === "hd") {
    queuePremiumHdVideo({ videoId, userId, videoUrl: video.videoUrl });
  }

  return { success: true, scheduledAt: scheduledAt?.toISOString() ?? null };
}
