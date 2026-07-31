import { eq, and, sql } from "drizzle-orm";
import { db } from "./index";
import { favorites, videos } from "../../drizzle/schema";

/* =====================
FAVORITES
===================== */

export async function getUserFavorite(userId: number, videoId: number) {
  return (
    await db
      .select()
      .from(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)))
      .limit(1)
  )[0];
}

export async function favoriteVideo(userId: number, videoId: number) {
  const exists = await getUserFavorite(userId, videoId);
  if (exists) return;

  await db.insert(favorites).values({ userId, videoId });

  await db
    .update(videos)
    .set({ favorites: sql`${videos.favorites} + 1` })
    .where(eq(videos.id, videoId));
}

export async function unfavoriteVideo(userId: number, videoId: number) {
  try {
    await db
      .delete(favorites)
      .where(and(eq(favorites.userId, userId), eq(favorites.videoId, videoId)));

    // ✅ SÉCURITÉ COMPTEUR (GREATEST)
    await db
      .update(videos)
      .set({ favorites: sql`GREATEST(${videos.favorites} - 1, 0)` })
      .where(eq(videos.id, videoId));

    return { success: true };
  } catch (error) {
    console.error("unfavoriteVideo error:", error);
    return { success: false };
  }
}
