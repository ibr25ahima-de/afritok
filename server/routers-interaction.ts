import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import { videos } from "../drizzle/schema";
import { eq } from "drizzle-orm";

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
} from "./db";

import {
  recordLikeEarning,
  recordCommentEarning,
  recordShareEarning,
} from "./micro-earnings";

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

        await db.update(videos)
          .set({ likes: (video.likes || 0) - 1 })
          .where(eq(videos.id, input.videoId));

        return { liked: false };
      }

      await likeVideo(user.id, input.videoId);

      await db.update(videos)
        .set({ likes: (video.likes || 0) + 1 })
        .where(eq(videos.id, input.videoId));

      const earning = await recordLikeEarning(user.id, input.videoId);

      return {
        liked: true,
        earning,
      };
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
    .input(
      z.object({
        videoId: z.number(),
        text: z.string().min(1).max(500),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await addComment(user.id, input.videoId, input.text);

      await db
        .update(videos)
        .set({ comments: (video.comments || 0) + 1 })
        .where(eq(videos.id, input.videoId));

      const earning = await recordCommentEarning(user.id, input.videoId, input.text.length);

      return {
        success: true,
        earning,
      };
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

        // ✅ UPDATE compteur (decrement)
        await db
          .update(videos)
          .set({ favorites: (video.favorites || 0) - 1 })
          .where(eq(videos.id, input.videoId));

        return { favorited: false };
      }

      await favoriteVideo(user.id, input.videoId);

      // ✅ UPDATE compteur (increment)
      await db
        .update(videos)
        .set({ favorites: (video.favorites || 0) + 1 })
        .where(eq(videos.id, input.videoId));

      // pas de gain pour favorite (sécurité)

      return {
        favorited: true,
      };
    }),
});

/* =========================
SHARE
========================= */
export const shareRouter = router({
  create: protectedProcedure
    .input(
      z.object({
        videoId: z.number(),
        platform: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = ctx.user;
      if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await shareVideo(user.id, input.videoId, input.platform);

      await db
        .update(videos)
        .set({ shares: (video.shares || 0) + 1 })
        .where(eq(videos.id, input.videoId));

      const earning = await recordShareEarning(user.id, input.videoId);

      return {
        success: true,
        earning,
      };
    }),
});
