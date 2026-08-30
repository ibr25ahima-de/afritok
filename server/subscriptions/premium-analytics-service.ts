import { db } from "../db";
import { videos } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { requirePremiumAccess } from "./premium-access";

export async function getPremiumAnalytics(userId: number, days = 30) {
  await requirePremiumAccess(userId);
  const safeDays = Math.min(Math.max(Math.floor(days), 7), 90);
  const summary = await db.select({
    videos: sql<number>`count(*)`,
    views: sql<number>`coalesce(sum(${videos.views}), 0)`,
    likes: sql<number>`coalesce(sum(${videos.likes}), 0)`,
    comments: sql<number>`coalesce(sum(${videos.comments}), 0)`,
    shares: sql<number>`coalesce(sum(${videos.shares}), 0)`,
    favorites: sql<number>`coalesce(sum(${videos.favorites}), 0)`,
  }).from(videos).where(sql`${videos.userId} = ${userId} AND ${videos.createdAt} >= NOW() - (${safeDays} || ' days')::interval`);

  const topVideos = await db.select({
    id: videos.id,
    title: videos.title,
    views: videos.views,
    likes: videos.likes,
    comments: videos.comments,
    shares: videos.shares,
    favorites: videos.favorites,
    createdAt: videos.createdAt,
  }).from(videos).where(sql`${videos.userId} = ${userId} AND ${videos.createdAt} >= NOW() - (${safeDays} || ' days')::interval`).orderBy(sql`(${videos.views} + ${videos.likes} + ${videos.comments} + ${videos.shares} + ${videos.favorites}) DESC`).limit(10);

  return { periodDays: safeDays, summary: summary[0] ?? { videos: 0, views: 0, likes: 0, comments: 0, shares: 0, favorites: 0 }, topVideos };
}
