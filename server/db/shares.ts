import { eq, sql } from "drizzle-orm";
import { db } from "./index";
import { shares, videos } from "../../drizzle/schema";

/* =====================
SHARES
===================== */

export async function shareVideo(userId: number, videoId: number, platform: string) {
  await db.insert(shares).values({ userId, videoId, platform });

  await db
    .update(videos)
    .set({ shares: sql`${videos.shares} + 1` })
    .where(eq(videos.id, videoId));
}
