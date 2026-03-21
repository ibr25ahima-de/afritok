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

// ============================================
// LIKE ROUTES
// ============================================

export const likeRouter = router({
  toggle: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await getUserLike(ctx.user.id, input.videoId);

      if (existing) {
        await unlikeVideo(ctx.user.id, input.videoId);
        return { liked: false };
      }

      await likeVideo(ctx.user.id, input.videoId);

      // 💰 Gain pour l'utilisateur qui like
      await createEarning(ctx.user.id, 0.01, "like", input.videoId);

      return { liked: true };
    }),

  isLiked: publicProcedure
    .input(z.object({ videoId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const like = await getUserLike(input.userId, input.videoId);
      return !!like;
    }),

  getCount: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      return video?.likes || 0;
    }),
});

// ============================================
// COMMENT ROUTES
// ============================================

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
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await addComment(ctx.user.id, input.videoId, input.text);

      // 💰 Gain commentaire
      await createEarning(ctx.user.id, 0.02, "comment", input.videoId);

      return { success: true };
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      await deleteComment(input.commentId);
      return { success: true };
    }),

  getCount: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      return video?.comments || 0;
    }),
});

// ============================================
// FAVORITE ROUTES
// ============================================

export const favoriteRouter = router({
  toggle: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      const existing = await getUserFavorite(ctx.user.id, input.videoId);

      if (existing) {
        await unfavoriteVideo(ctx.user.id, input.videoId);
        return { favorited: false };
      }

      await favoriteVideo(ctx.user.id, input.videoId);

      // 💰 Gain favorite
      await createEarning(ctx.user.id, 0.01, "favorite", input.videoId);

      return { favorited: true };
    }),

  isFavorited: publicProcedure
    .input(z.object({ videoId: z.number(), userId: z.number() }))
    .query(async ({ input }) => {
      const fav = await getUserFavorite(input.userId, input.videoId);
      return !!fav;
    }),

  getCount: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      return video?.favorites || 0;
    }),
});

// ============================================
// SHARE ROUTES
// ============================================

export const shareRouter = router({
  create: protectedProcedure
    .input(z.object({
      videoId: z.number(),
      platform: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND" });

      await shareVideo(ctx.user.id, input.videoId, input.platform);

      // 💰 Gain partage
      await createEarning(ctx.user.id, 0.05, "share", input.videoId);

      return { success: true };
    }),

  getCount: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      return video?.shares || 0;
    }),
});
