import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, likes, comments, favorites, shares, followers, earnings, withdrawals, videos } from "../../drizzle/schema";

export async function updateUserProfile(
  userId: number,
  data: {
    name: string;
    bio?: string;
    country?: string;
  }
) {
  await db
    .update(users)
    .set({
      name: data.name,
      bio: data.bio,
      country: data.country,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return { success: true };
}

export async function updateUserAvatar(
  userId: number,
  avatarUrl: string
) {
  await db
    .update(users)
    .set({
      avatarUrl,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  return {
    success: true,
    avatarUrl,
  };
}

export async function deleteUserAccount(userId: number) {
  // Supprimer les interactions
  await db.delete(likes).where(eq(likes.userId, userId));
  await db.delete(comments).where(eq(comments.userId, userId));
  await db.delete(favorites).where(eq(favorites.userId, userId));
  await db.delete(shares).where(eq(shares.userId, userId));
  await db.delete(followers).where(eq(followers.followerId, userId));
  await db.delete(followers).where(eq(followers.followingId, userId));
  await db.delete(earnings).where(eq(earnings.userId, userId));
  await db.delete(withdrawals).where(eq(withdrawals.userId, userId));

  // Supprimer les vidéos
  await db.delete(videos).where(eq(videos.userId, userId));

  // Supprimer le compte
  await db.delete(users).where(eq(users.id, userId));

  return { success: true };
}
