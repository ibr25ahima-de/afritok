import { router, protectedProcedure } from "../../_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "../../db";
import {
  users,
  videos,
  earnings,
  withdrawals,
  comments,
  likes,
  favorites,
  followers,
  warnings,
} from "../../../drizzle/schema";
import {
  eq,
  desc,
  count,
  sum,
} from "drizzle-orm";

export const usersRouter = router({
  /**
   * 👤 Voir tous les utilisateurs
   */
  getAllUsers: protectedProcedure.query(async ({ ctx }) => {
    if (!ctx.user || ctx.user.role !== "admin") {
      throw new TRPCError({ code: "FORBIDDEN" });
    }

    return db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));
  }),

  /**
   * 🚫 Bannir un utilisateur
   */
  banUser: protectedProcedure
    .input((val: {
      userId: number;
      reason: string;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isBanned: true,
          banReason: input.reason,
          bannedAt: new Date().toISOString(),
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ✅ Débannir un utilisateur
   */
  unbanUser: protectedProcedure
    .input((val: {
      userId: number;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isBanned: false,
          banReason: null,
          bannedAt: null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ⏸️ Suspendre un utilisateur
   */
  suspendUser: protectedProcedure
    .input((val: {
      userId: number;
      days: number;
      reason: string;
    }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const suspendedUntil = new Date();
      suspendedUntil.setDate(suspendedUntil.getDate() + input.days);

      await db
        .update(users)
        .set({
          isSuspended: true,
          suspendedUntil: suspendedUntil.toISOString(),
          suspensionReason: input.reason,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * ▶️ Lever une suspension
   */
  unsuspendUser: protectedProcedure
    .input((val: { userId: number }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .update(users)
        .set({
          isSuspended: false,
          suspendedUntil: null,
          suspensionReason: null,
        })
        .where(eq(users.id, input.userId));

      return { success: true };
    }),

  /**
   * 👤 Voir les détails d'un utilisateur
   */
  getUserDetails: protectedProcedure
    .input((val: { userId: number }) => val)
    .query(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      const user = await db
        .select()
        .from(users)
        .where(eq(users.id, input.userId));

      if (user.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Utilisateur introuvable",
        });
      }

      const userVideos = await Promise.all(
        (
          await db
            .select()
            .from(videos)
            .where(eq(videos.userId, input.userId))
        ).map(async (video) => {
          const videoComments = await db
            .select({
              id: comments.id,
              text: comments.text,
              createdAt: comments.createdAt,
              userId: comments.userId,
              userName: users.name,
              phone: users.phone,
            })
            .from(comments)
            .leftJoin(users, eq(comments.userId, users.id))
            .where(eq(comments.videoId, video.id));

          return {
            ...video,
            comments: videoComments,
          };
        })
      );

      const videoCount = await db
        .select()
        .from(videos)
        .where(eq(videos.userId, input.userId));

      const earningCount = await db
        .select()
        .from(earnings)
        .where(eq(earnings.userId, input.userId));

      const withdrawalCount = await db
        .select()
        .from(withdrawals)
        .where(eq(withdrawals.userId, input.userId));

      const totalEarnings = await db
        .select({
          total: sum(earnings.amount),
        })
        .from(earnings)
        .where(eq(earnings.userId, input.userId));

      const totalWithdrawals = await db
        .select({
          total: sum(withdrawals.amount),
        })
        .from(withdrawals)
        .where(eq(withdrawals.userId, input.userId));

      const userComments = await db
        .select()
        .from(comments)
        .where(eq(comments.userId, input.userId));

      const userLikes = await db
        .select()
        .from(likes)
        .where(eq(likes.userId, input.userId));

      const userFavorites = await db
        .select()
        .from(favorites)
        .where(eq(favorites.userId, input.userId));

      const userFollowers = await db
        .select()
        .from(followers)
        .where(eq(followers.followingId, input.userId));

      const userFollowing = await db
        .select()
        .from(followers)
        .where(eq(followers.followerId, input.userId));

      const userWarnings = await db
        .select()
        .from(warnings)
        .where(eq(warnings.userId, input.userId));

      return {
        ...user[0],
        videos: userVideos,
        warnings: userWarnings,

        balance: {
          totalEarnings: Number(totalEarnings[0]?.total ?? 0),
          totalWithdrawals: Number(totalWithdrawals[0]?.total ?? 0),
          available:
            Number(totalEarnings[0]?.total ?? 0) -
            Number(totalWithdrawals[0]?.total ?? 0),
        },

        stats: {
          videos: videoCount.length,
          comments: userComments.length,
          likes: userLikes.length,
          favorites: userFavorites.length,
          followers: userFollowers.length,
          following: userFollowing.length,
          earnings: Number(totalEarnings[0]?.total ?? 0),
          withdrawals: Number(totalWithdrawals[0]?.total ?? 0),
        },
      };
    }),

  /**
   * 🗑️ Supprimer une vidéo
   */
  deleteVideo: protectedProcedure
    .input((val: { videoId: number }) => val)
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user || ctx.user.role !== "admin") {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      await db
        .delete(videos)
        .where(eq(videos.id, input.videoId));

      return { success: true };
    }),
});
