import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { videos } from "../../drizzle/schema";
import { getVideoById } from "./videos";
import { createEarning } from "./earnings";

/* =====================
VIEWS
===================== */

export async function incrementVideoViews(videoId: number, userId?: number) {
  // 1. Incrémenter la vue
  await db
    .update(videos)
    .set({ views: sql`${videos.views} + 1` })
    .where(eq(videos.id, videoId));

  // 2. Récupérer la vidéo
  const video = await getVideoById(videoId);
  if (!video) return;

  // 3. 👤 PAYER LE VIEWER
  if (userId) {
    await createEarning(userId, 0, "view", videoId);
  }

  // 4. 🎬 PAYER LE CRÉATEUR (plus important)
  if (video.userId && video.userId !== userId) {
    await createEarning(video.userId, 0, "creator_view", videoId);
  }
}
