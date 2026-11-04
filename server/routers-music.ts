import { router, publicProcedure } from "./_core/trpc";
import { db } from "./db";
import { getVideoById } from "./db/videos";
import { users, videos, music } from "../drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const musicRouter = router({
  getSourceVideo: publicProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .query(({ input }) => getVideoById(input.videoId)),

  getTrending: publicProcedure.query(async () =>
    db.select().from(music)
      .where(eq(music.isActive, true))
      .orderBy(desc(music.plays), desc(music.createdAt))
      .limit(100)
  ),

  getByTab: publicProcedure
    .input(z.object({
      tab: z.enum(["popular", "forYou", "favorites", "recent"]),
    }))
    .query(async ({ input }) => {
      const order = input.tab === "recent"
        ? desc(music.createdAt)
        : desc(music.plays);
      return db.select().from(music)
        .where(eq(music.isActive, true))
        .orderBy(order, desc(music.createdAt))
        .limit(100);
    }),

  search: publicProcedure
    .input(z.object({ query: z.string().trim().max(100) }))
    .query(async ({ input }) => {
      if (!input.query) return [];
      const term = `%${input.query.toLowerCase()}%`;
      return db.select().from(music)
        .where(and(
          eq(music.isActive, true),
          sql`(LOWER(${music.title}) LIKE ${term} OR LOWER(${music.artist}) LIKE ${term})`
        ))
        .orderBy(desc(music.plays))
        .limit(100);
    }),

  getVideosBySound: publicProcedure
    .input(z.object({ videoId: z.number().int().positive(), limit: z.number().int().min(1).max(50).default(30), offset: z.number().int().min(0).default(0) }))
    .query(async ({ input }) => {
      const sourceVideo = await getVideoById(input.videoId);
      const soundUrl = sourceVideo?.musicUrl || sourceVideo?.videoUrl;
      if (!soundUrl) return [];

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
          user: { id: users.id, name: users.name, avatarUrl: users.avatarUrl },
        })
        .from(videos)
        .leftJoin(users, eq(videos.userId, users.id))
        .where(and(
          sql`COALESCE(${videos.musicUrl}, ${videos.videoUrl}) = ${soundUrl}`,
          sql`${videos.visibility} = 'public'`,
          sql`${videos.videoUrl} IS NOT NULL`,
        ))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
