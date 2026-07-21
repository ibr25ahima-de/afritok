import { router, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { getFeedVideos } from "./db";

export const feedRouter = router({
  getFeed: publicProcedure
    .input(
      z.object({
        limit: z.number().default(1000),
        offset: z.number().default(0),
      })
    )
    .query(async ({ input }) => {
      const videos = await getFeedVideos(input.limit, input.offset);
      return videos;
    }),
});
