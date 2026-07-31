import { eq, and } from "drizzle-orm";
import { db } from "../db";
import { followers } from "../../drizzle/schema";

export async function isFollowing(followerId: number, followingId: number) {
  const res = await db
    .select()
    .from(followers)
    .where(
      and(
        eq(followers.followerId, followerId),
        eq(followers.followingId, followingId)
      )
    )
    .limit(1);

  return res.length > 0;
}

export async function getFollowerCount(userId: number) {
  return (await db.select().from(followers).where(eq(followers.followingId, userId))).length;
}

export async function getFollowingCount(userId: number) {
  return (await db.select().from(followers).where(eq(followers.followerId, userId))).length;
}
