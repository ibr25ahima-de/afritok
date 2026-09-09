import { router, adminProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db, getUserEarnings, deleteComment } from "../../db";
import {
  users,
  videos,
  earnings,
  withdrawals,
  comments,
  likes,
  favorites,
  shares,
  followers,
  warnings,
} from "../../../drizzle/schema";
import { eq, desc, sum } from "drizzle-orm";
import { z } from "zod";
import { getVideoById } from "../../db/videos";
import { storageDeleteVideo } from "../../storage";

const positiveId = z.number().int().positive();
const moderationReason = z.string().trim().min(1).max(500);

export const usersRouter = router({
  getAllUsers: adminProcedure.query(async () => {
    // Never return secrets or authentication material from an admin listing.
    return db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
        avatarUrl: users.avatarUrl,
        country: users.country,
        currency: users.currency,
        profilePublic: users.profilePublic,
        isBanned: users.isBanned,
        banReason: users.banReason,
        bannedAt: users.bannedAt,
        isSuspended: users.isSuspended,
        suspendedUntil: users.suspendedUntil,
        suspensionReason: users.suspensionReason,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  banUser: adminProcedure
    .input(z.object({ userId: positiveId, reason: moderationReason }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas se bannir lui-même." });
      }
      const target = await db
        .select({ id: users.id, role: users.role })
        .from(users)
        .where(eq(users.id, input.userId))
        .limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
      if (target[0].role === "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas bannir un autre administrateur." });
      }
      await db.update(users).set({ isBanned: true, banReason: input.reason, bannedAt: new Date().toISOString() }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  unbanUser: adminProcedure
    .input(z.object({ userId: positiveId }))
    .mutation(async ({ input }) => {
      await db.update(users).set({ isBanned: false, banReason: null, bannedAt: null }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  suspendUser: adminProcedure
    .input(z.object({ userId: positiveId, days: z.number().int().min(1).max(3650), reason: moderationReason }))
    .mutation(async ({ ctx, input }) => {
      if (input.userId === ctx.user.id) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas se suspendre lui-même." });
      }
      const target = await db.select({ id: users.id, role: users.role }).from(users).where(eq(users.id, input.userId)).limit(1);
      if (!target[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable." });
      if (target[0].role === "admin") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Un administrateur ne peut pas suspendre un autre administrateur." });
      }
      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + input.days);
      await db.update(users).set({ isSuspended: true, suspendedUntil: suspendedUntil.toISOString(), suspensionReason: input.reason }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  unsuspendUser: adminProcedure
    .input(z.object({ userId: positiveId }))
    .mutation(async ({ input }) => {
      await db.update(users).set({ isSuspended: false, suspendedUntil: null, suspensionReason: null }).where(eq(users.id, input.userId));
      return { success: true };
    }),

  getUserDetails: adminProcedure
    .input(z.object({ userId: positiveId }))
    .query(async ({ input }) => {
      const user = await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          avatarUrl: users.avatarUrl,
          country: users.country,
          currency: users.currency,
          profilePublic: users.profilePublic,
          isBanned: users.isBanned,
          banReason: users.banReason,
          bannedAt: users.bannedAt,
          isSuspended: users.isSuspended,
          suspendedUntil: users.suspendedUntil,
          suspensionReason: users.suspensionReason,
          createdAt: users.createdAt,
          updatedAt: users.updatedAt,
        })
        .from(users)
        .where(eq(users.id, input.userId));
      if (user.length === 0) throw new TRPCError({ code: "NOT_FOUND", message: "Utilisateur introuvable" });

      const userVideos = await Promise.all((await db.select().from(videos).where(eq(videos.userId, input.userId))).map(async (video) => {
        const videoComments = await db
          .select({ id: comments.id, text: comments.text, createdAt: comments.createdAt, userId: comments.userId, userName: users.name })
          .from(comments)
          .leftJoin(users, eq(comments.userId, users.id))
          .where(eq(comments.videoId, video.id));
        return { ...video, comments: videoComments };
      }));

      const videoCount = await db.select().from(videos).where(eq(videos.userId, input.userId));
      const userComments = await db.select().from(comments).where(eq(comments.userId, input.userId));
      const userLikes = await db.select().from(likes).where(eq(likes.userId, input.userId));
      const userFavorites = await db.select().from(favorites).where(eq(favorites.userId, input.userId));
      const userFollowers = await db.select().from(followers).where(eq(followers.followingId, input.userId));
      const userFollowing = await db.select().from(followers).where(eq(followers.followerId, input.userId));
      const userWarnings = await db.select().from(warnings).where(eq(warnings.userId, input.userId));
      const userEarnings = await getUserEarnings(input.userId);
      const totalWithdrawals = await db.select({ total: sum(withdrawals.amount) }).from(withdrawals).where(eq(withdrawals.userId, input.userId));
      const totalEarnings = userEarnings?.total ?? 0;
      const available = userEarnings?.available ?? 0;
      const pending = userEarnings?.pending ?? 0;

      return {
        ...user[0],
        videos: userVideos,
        warnings: userWarnings,
        balance: {
          totalEarnings: Number(totalEarnings),
          totalWithdrawals: Number(totalWithdrawals[0]?.total ?? 0),
          available: Number(available),
          pending: Number(pending),
        },
        stats: {
          videos: videoCount.length,
          comments: userComments.length,
          likes: userLikes.length,
          favorites: userFavorites.length,
          followers: userFollowers.length,
          following: userFollowing.length,
          earnings: Number(totalEarnings),
          withdrawals: Number(totalWithdrawals[0]?.total ?? 0),
        },
      };
    }),

  deleteVideo: adminProcedure
    .input(z.object({ videoId: positiveId }))
    .mutation(async ({ input }) => {
      const video = await getVideoById(input.videoId);
      if (!video) throw new TRPCError({ code: "NOT_FOUND", message: "Vidéo introuvable." });
      try {
        await storageDeleteVideo(video.videoUrl);
      } catch (error) {
        console.error("[admin.video.delete] Storage cleanup failed; deleting database record anyway:", error);
      }
      await db.delete(comments).where(eq(comments.videoId, input.videoId));
      await db.delete(likes).where(eq(likes.videoId, input.videoId));
      await db.delete(favorites).where(eq(favorites.videoId, input.videoId));
      await db.delete(shares).where(eq(shares.videoId, input.videoId));
      await db.delete(videos).where(eq(videos.id, input.videoId));
      return { success: true };
    }),

  deleteComment: adminProcedure
    .input(z.object({ commentId: positiveId }))
    .mutation(async ({ input }) => {
      const result = await deleteComment(input.commentId);
      if (!result.success) throw new TRPCError({ code: "NOT_FOUND", message: "Commentaire introuvable ou déjà supprimé" });
      return { success: true };
    }),
});
