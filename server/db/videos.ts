import { eq, desc, sql, and, or, isNull, lte } from "drizzle-orm";
import { db } from "./index";
import { videos, users } from "../../drizzle/schema";

/* =====================
VIDEOS
===================== */

export async function getVideoById(videoId: number) {
  return (await db.select().from(videos).where(eq(videos.id, videoId)).limit(1))[0];
}

export async function getFeedVideos(limit: number, offset: number) {
  return await db
    .select({
      id: videos.id,
      userId: videos.userId,
      title: videos.title,
      description: videos.description,
      videoUrl: sql<string>`COALESCE("videos"."hdVideoUrl", "videos"."videoUrl")`,
      thumbnailUrl: videos.thumbnailUrl,
      views: videos.views,
      likes: videos.likes,
      comments: videos.comments,
      shares: videos.shares,
      favorites: videos.favorites,
      createdAt: videos.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(videos)
    .leftJoin(users, eq(videos.userId, users.id))
    .where(and(
      or(eq(videos.isPublic, true), isNull(videos.isPublic)),
      sql`${videos.videoUrl} IS NOT NULL`,
      or(isNull(videos.scheduledAt), lte(videos.scheduledAt, new Date()))
    ))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserVideos(userId: number) {
  return db
    .select()
    .from(videos)
    .where(and(
      eq(videos.userId, userId),
      or(eq(videos.isPublic, true), isNull(videos.isPublic))
    ))
    .orderBy(desc(videos.createdAt));
}