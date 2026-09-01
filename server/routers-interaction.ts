import { router, protectedProcedure, publicProcedure } from "./_core/trpc";
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { db } from "./db";
import { videos, users } from "../drizzle/schema";
import { eq, sql } from "drizzle-orm";

import { getUserLike, getUserFavorite, getVideoComments, getVideoById, likeVideo, unlikeVideo, favoriteVideo, unfavoriteVideo, addComment, deleteComment, shareVideo, isFollowing } from "./db";
import { recordLikeEarning, recordCommentEarning, recordShareEarning } from "./micro-earnings";

export const likeRouter = router({
  toggle: protectedProcedure.input(z.object({ videoId: z.number() })).mutation(async ({ ctx, input }) => {
    const user = ctx.user; if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" });
    const existing = await getUserLike(user.id, input.videoId);
    if (existing) { await unlikeVideo(user.id, input.videoId); await db.update(videos).set({ likes: (video.likes || 0) - 1 }).where(eq(videos.id, input.videoId)); return { liked: false }; }
    await likeVideo(user.id, input.videoId); await db.update(videos).set({ likes: (video.likes || 0) + 1 }).where(eq(videos.id, input.videoId)); return { liked: true, earning: await recordLikeEarning(user.id, input.videoId) };
  }),
});

export const commentRouter = router({
  getByVideo: publicProcedure.input(z.object({ videoId: z.number() })).query(async ({ input }) => { const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" }); return getVideoComments(input.videoId); }),
  create: protectedProcedure.input(z.object({ videoId: z.number(), text: z.string().min(1).max(500) })).mutation(async ({ ctx, input }) => {
    const user = ctx.user; if (!user) throw new TRPCError({ code: "UNAUTHORIZED" });
    const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" });
    await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "commentsMode" text`);
    const [owner] = await db.select({ allowComments: users.allowComments }).from(users).where(eq(users.id, video.userId)).limit(1);
    if (!owner) throw new TRPCError({ code: "NOT_FOUND", message: "Propriétaire du contenu introuvable." });
    if (!owner.allowComments) throw new TRPCError({ code: "FORBIDDEN", message: "Cette personne a désactivé les commentaires." });
    const modeResult = await db.execute(sql`SELECT "commentsMode" FROM "videos" WHERE "id" = ${input.videoId} LIMIT 1`);
    const mode = String((modeResult as any).rows?.[0]?.commentsMode ?? "all");
    if (mode === "off") throw new TRPCError({ code: "FORBIDDEN", message: "Les commentaires sont désactivés pour cette vidéo." });
    if (mode === "followers" && user.id !== video.userId && !(await isFollowing(user.id, video.userId))) throw new TRPCError({ code: "FORBIDDEN", message: "Cette vidéo accepte uniquement les commentaires des abonnés." });
    await addComment(user.id, input.videoId, input.text);
    await db.update(videos).set({ comments: (video.comments || 0) + 1 }).where(eq(videos.id, input.videoId));
    return { success: true, earning: await recordCommentEarning(user.id, input.videoId) };
  }),
  delete: protectedProcedure.input(z.object({ commentId: z.number() })).mutation(async ({ ctx, input }) => { const user = ctx.user; if (!user) throw new TRPCError({ code: "UNAUTHORIZED" }); if (user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "Seul un administrateur peut supprimer un commentaire." }); const result = await deleteComment(input.commentId); if (!result.success) throw new TRPCError({ code: "NOT_FOUND", message: "Commentaire introuvable ou déjà supprimé." }); return { success: true, message: "Commentaire supprimé avec succès." }; }),
});

export const favoriteRouter = router({
  toggle: protectedProcedure.input(z.object({ videoId: z.number() })).mutation(async ({ ctx, input }) => { const user = ctx.user; if (!user) throw new TRPCError({ code: "UNAUTHORIZED" }); const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" }); const existing = await getUserFavorite(user.id, input.videoId); if (existing) { await unfavoriteVideo(user.id, input.videoId); await db.update(videos).set({ favorites: (video.favorites || 0) - 1 }).where(eq(videos.id, input.videoId)); return { favorited: false }; } await favoriteVideo(user.id, input.videoId); await db.update(videos).set({ favorites: (video.favorites || 0) + 1 }).where(eq(videos.id, input.videoId)); return { favorited: true }; }),
});

export const shareRouter = router({
  create: protectedProcedure.input(z.object({ videoId: z.number(), platform: z.string() })).mutation(async ({ ctx, input }) => { const user = ctx.user; if (!user) throw new TRPCError({ code: "UNAUTHORIZED" }); const video = await getVideoById(input.videoId); if (!video) throw new TRPCError({ code: "NOT_FOUND" }); await shareVideo(user.id, input.videoId, input.platform); await db.update(videos).set({ shares: (video.shares || 0) + 1 }).where(eq(videos.id, input.videoId)); return { success: true, earning: await recordShareEarning(user.id, input.videoId) }; }),
});
