import { eq, desc, sql, and, or, isNull } from "drizzle-orm";
import { db } from "./index";
import { videos, users } from "../../drizzle/schema";

/* =====================
VIDEOS
===================== */
export async function getVideoById(videoId: number) {
  const result = await db.execute(sql`
    SELECT *
    FROM "videos"
    WHERE "id" = ${videoId}
    LIMIT 1
  `);
  return (result as any).rows?.[0] as any;
}

function visibilityCondition(viewerId?: number | null) {
  if (!viewerId) {
    return sql`"videos"."visibility" = 'public'`;
  }

  return sql`(
    "videos"."visibility" = 'public'
    OR "videos"."userId" = ${viewerId}
    OR (
      "videos"."visibility" = 'followers'
      AND EXISTS (
        SELECT 1
        FROM "followers"
        WHERE "followers"."followerId" = ${viewerId}
          AND "followers"."followingId" = "videos"."userId"
      )
    )
  )`;
}

export async function getFeedVideos(limit: number, offset: number, viewerId?: number | null) {
  return db
    .select({
      id: videos.id,
      userId: videos.userId,
      title: videos.title,
      description: videos.description,
      videoUrl: videos.videoUrl,
      thumbnailUrl: videos.thumbnailUrl,
      views: videos.views,
      likes: videos.likes,
      comments: videos.comments,
      shares: videos.shares,
      favorites: videos.favorites,
      createdAt: videos.createdAt,
      user: {
        id: users.id,
        name: users.name,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(videos)
    .leftJoin(users, eq(videos.userId, users.id))
    .where(and(
      visibilityCondition(viewerId),
      sql`${videos.videoUrl} IS NOT NULL`
    ))
    .orderBy(desc(videos.createdAt))
    .limit(limit)
    .offset(offset);
}

export async function getUserVideos(userId: number, viewerId?: number | null) {
  if (viewerId === userId) {
    return db
      .select()
      .from(videos)
      .where(eq(videos.userId, userId))
      .orderBy(desc(videos.createdAt));
  }

  const followerAccess = viewerId
    ? sql`(
        "videos"."visibility" = 'followers'
        AND EXISTS (
          SELECT 1
          FROM "followers"
          WHERE "followers"."followerId" = ${viewerId}
            AND "followers"."followingId" = "videos"."userId"
        )
      )`
    : sql`FALSE`;

  return db
    .select()
    .from(videos)
    .where(and(
      eq(videos.userId, userId),
      sql`(
        "videos"."visibility" = 'public'
        OR ${followerAccess}
      )`
    ))
    .orderBy(desc(videos.createdAt));
}

export async function canViewVideo(videoId: number, viewerId?: number | null, isAdmin = false) {
  const video = await getVideoById(videoId);
  if (!video) return false;
  if (isAdmin || video.userId === viewerId) return true;
  if (video.visibility === "public" || video.visibility == null) return true;
  if (video.visibility === "private") return false;
  if (video.visibility === "followers" && viewerId) {
    const result = await db.execute(sql`
      SELECT 1
      FROM "followers"
      WHERE "followerId" = ${viewerId}
        AND "followingId" = ${video.userId}
      LIMIT 1
    `);
    return Boolean((result as any).rows?.length);
  }
  return false;
}
