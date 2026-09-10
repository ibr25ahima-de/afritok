import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getFeedVideos } from "./db";

const MAX_FEED_LIMIT = 100;

export const feedRouter = router({
  getFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().int().min(1).max(MAX_FEED_LIMIT).default(20),
        offset: z.number().int().min(0).max(1000000).default(0),
      })
    )
    .query(async ({ input }) => {
      const videos = await getFeedVideos(input.limit, input.offset);
      return videos;
    }),
});
