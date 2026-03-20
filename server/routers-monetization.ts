import { z } from "zod";
import { publicProcedure, router } from "./trpc";
import {
  recordLikeEarning,
  recordWatchEarning,
  recordCommentEarning,
} from "./micro-earnings";

export const monetizationRouter = router({
  // LIKE
  like: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");

      return recordLikeEarning(userId, input.videoId);
    }),

  // WATCH
  watch: publicProcedure
    .input(z.object({
      videoId: z.number(),
      duration: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");

      return recordWatchEarning(userId, input.videoId, input.duration);
    }),

  // COMMENT
  comment: publicProcedure
    .input(z.object({
      videoId: z.number(),
      length: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const userId = ctx.user?.id;
      if (!userId) throw new Error("Unauthorized");

      return recordCommentEarning(userId, input.videoId, input.length);
    }),
});
