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
  db,
} from "./db";
import { likes, favorites, shares, comments } from "../drizzle/schema";
import { eq } from "drizzle-orm";

// ============================================
// LIKE ROUTES
// ============================================
export const likeRouter = router({
  toggle: protectedProcedure
    .input(z.object({ videoId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const existingLike = await getUserLike(ctx.user.id, input.videoId);

        if (existingLike) {
          await unlikeVideo(ctx.user.id, input.videoId);
          return { liked: false };
        } else {
          await likeVideo(ctx.user.id, input.videoId);
          return { liked: true };
        }
      } catch (error) {
        console.error("[Like] Toggle error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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
    .input(z.object({ videoId: z.number(), text: z.string().min(1).max(500) }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        await addComment(ctx.user.id, input.videoId, input.text);
        return { success: true };
      } catch (error) {
        console.error("[Comment] Create error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  delete: protectedProcedure
    .input(z.object({ commentId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        await deleteComment(input.commentId);
        return { success: true };
      } catch (error) {
        console.error("[Comment] Delete error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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

      try {
        const existing = await getUserFavorite(ctx.user.id, input.videoId);

        if (existing) {
          await unfavoriteVideo(ctx.user.id, input.videoId);
          return { favorited: false };
        } else {
          await favoriteVideo(ctx.user.id, input.videoId);
          return { favorited: true };
        }
      } catch (error) {
        console.error("[Favorite] Toggle error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
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
    .input(z.object({ videoId: z.number(), platform: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        await shareVideo(ctx.user.id, input.videoId, input.platform);
        return { success: true };
      } catch (error) {
        console.error("[Share] Create error:", error);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      }
    }),

  getCount: publicProcedure
    .input(z.object({ videoId: z.number() }))
    .query(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      return video?.shares || 0;
    }),
});
