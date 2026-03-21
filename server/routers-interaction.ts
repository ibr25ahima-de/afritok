import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";

import {
  getUserLike,
  getUserFavorite,
  getVideoComments,
  getVideoById,
  likeVideo,
  unlikeVideo,
  favoriteVideo,
  unfavoriteVideo,
  addComment,
  deleteComment,
  shareVideo,
  createEarning,
} from "./db";

/* =========================
LIKE
========================= */
export const likeRouter = router({
  toggle: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await getUserLike(user.id, input.videoId);

      if (existing) {
        await unlikeVideo(user.id, input.videoId);
        return { liked: false };
      }

      await likeVideo(user.id, input.videoId);

      // 💰 earning pour créateur
      await createEarning(video.userId, 0.01, "like", input.videoId);

      return { liked: true };
    }),
});

/* =========================
COMMENT
========================= */
export const commentRouter = router({
  getByVideo: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(({ input }) => getVideoComments(input.videoId)),

  create: protectedProcedure
    .input(z.object({
      videoId: z.number(),
      text: z.string().min(1).max(500),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await addComment(user.id, input.videoId, input.text);

      await createEarning(video.userId, 0.02, "comment", input.videoId);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await deleteComment(input.commentId);
      return { success: true };
    }),
});

/* =========================
FAVORITE
========================= */
export const favoriteRouter = router({
  toggle: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await getUserFavorite(user.id, input.videoId);

      if (existing) {
        await unfavoriteVideo(user.id, input.videoId);
        return { favorited: false };
      }

      await favoriteVideo(user.id, input.videoId);

      await createEarning(video.userId, 0.008, "favorite", input.videoId);

      return { favorited: true };
    }),
});

/* =========================
SHARE
========================= */
export const shareRouter = router({
  create: protectedProcedure
    .input(z.object({
      videoId: z.number(),
      platform: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await shareVideo(user.id, input.videoId, input.platform);

      await createEarning(video.userId, 0.05, "share", input.videoId);

      return { success: true };
    }),
});
