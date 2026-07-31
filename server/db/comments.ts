import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { comments, videos } from "../../drizzle/schema";

/* =====================
COMMENTS
===================== */

export async function getVideoComments(videoId: number) {
  return db.select().from(comments).where(eq(comments.videoId, videoId));
}

export async function addComment(userId: number, videoId: number, text: string) {
  await db.insert(comments).values({ userId, videoId, text });

  await db
    .update(videos)
    .set({ comments: sql`${videos.comments} + 1` })
    .where(eq(videos.id, videoId));
}

export async function deleteComment(commentId: number) {
  try {
    const comment = await db
      .select()
      .from(comments)
      .where(eq(comments.id, commentId))
      .limit(1);

    if (!comment[0]) return { success: false };

    await db
      .delete(comments)
      .where(eq(comments.id, commentId));

    // ✅ SÉCURITÉ COMPTEUR (GREATEST)
    await db
      .update(videos)
      .set({ comments: sql`GREATEST(${videos.comments} - 1, 0)` })
      .where(eq(videos.id, comment[0].videoId));

    return { success: true };
  } catch (error) {
    console.error("deleteComment error:", error);
    return { success: false };
  }
}
