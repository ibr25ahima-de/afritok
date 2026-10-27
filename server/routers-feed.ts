import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getFeedVideos, getDb } from "./db";
import { getRecommendationEngine } from "./recommendation-engine";
import { videos } from "../drizzle/schema";
import { and, inArray, or, eq, exists, sql } from "drizzle-orm";
import { followers } from "../drizzle/schema";

const MAX_FEED_LIMIT = 100;

export const feedRouter = router({
  getFeed: publicProcedure
    .input(z.object({
      limit: z.number().int().min(1).max(MAX_FEED_LIMIT).default(20),
      offset: z.number().int().min(0).max(1000000).default(0),
    }))
    .query(async ({ input, ctx }) => {
      if (!ctx.user) return getFeedVideos(input.limit, input.offset, null);
      const engine = getRecommendationEngine();
      const ids = await engine.generatePersonalizedFeed(ctx.user.id, input.limit, input.offset);
      if (ids.length === 0) return getFeedVideos(input.limit, input.offset, ctx.user.id);
      const db = await getDb();
      if (!db) return getFeedVideos(input.limit, input.offset, ctx.user.id);
      const rows = await db.select().from(videos).where(and(
        inArray(videos.id, ids),
        sql`${videos.videoUrl} IS NOT NULL`,
        or(
          eq(videos.visibility, "public"),
          eq(videos.userId, ctx.user.id),
          and(
            eq(videos.visibility, "followers"),
            exists(db.select({ id: followers.followerId }).from(followers).where(and(
              eq(followers.followerId, ctx.user.id),
              eq(followers.followingId, videos.userId),
            ))),
          ),
        ),
      ));
      const byId = new Map(rows.map(video => [video.id, video]));
      return ids.map(id => byId.get(id)).filter((video): video is typeof rows[number] => Boolean(video));
    }),
});
