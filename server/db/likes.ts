import { eq, and, sql } from "drizzle-orm";
import { db } from "../db";
import { likes, videos } from "../../drizzle/schema";

export async function getUserLike(userId: number, videoId: number) {
  return (
    await db
      .select()
      .from(likes)
      .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)))
      .limit(1)
  )[0];
}

export async function likeVideo(userId: number, videoId: number) {
  const exists = await getUserLike(userId, videoId);
  if (exists) return;

  await db.insert(likes).values({ userId, videoId });

  await db
    .update(videos)
    .set({ likes: sql`${videos.likes} + 1` })
    .where(eq(videos.id, videoId));
}

export async function unlikeVideo(userId: number, videoId: number) {
  await db
    .delete(likes)
    .where(and(eq(likes.userId, userId), eq(likes.videoId, videoId)));

  // ✅ SÉCURITÉ COMPTEUR (GREATEST)
  await db
    .update(videos)
    .set({ likes: sql`GREATEST(${videos.likes} - 1, 0)` })
    .where(eq(videos.id, videoId));
}
