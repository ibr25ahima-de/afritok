import { router, publicProcedure } from "./_core/trpc";
import { storageList } from "./storage";
import { db } from "./db";
import { getVideoById } from "./db/videos";
import { users, videos } from "../drizzle/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";

export const musicRouter = router({
  getSourceVideo: publicProcedure
    .input(z.object({ videoId: z.number().int().positive() }))
    .query(({ input }) => getVideoById(input.videoId)),

  getTrending: publicProcedure.query(async () => {
    const files = await storageList("music");

    return files.map((file, index) => ({
      id: String(index + 1),
      title: file.name.replace(".mp3", ""),
      artist: "Afritok",
      audioUrl: file.url,
      category: "popular",
      duration: 0,
      plays: 0,
      isActive: true,
    }));
  }),

  getByTab: publicProcedure
    .input(
      z.object({
        tab: z.enum(["popular", "forYou", "favorites", "recent"]),
      })
    )
    .query(async () => {
      const files = await storageList("music");

      return files.map((file, index) => ({
        id: String(index + 1),
        title: file.name.replace(".mp3", ""),
        artist: "Afritok",
        audioUrl: file.url,
        category: "popular",
        duration: 0,
        plays: 0,
        isActive: true,
      }));
    }),

  search: publicProcedure
    .input(
      z.object({
        query: z.string(),
      })
    )
    .query(async ({ input }) => {
      const files = await storageList("music");

      return files
        .filter((file) =>
          file.name.toLowerCase().includes(input.query.toLowerCase())
        )
        .map((file, index) => ({
          id: String(index + 1),
          title: file.name.replace(".mp3", ""),
          artist: "Afritok",
          audioUrl: file.url,
          category: "popular",
          duration: 0,
          plays: 0,
          isActive: true,
        }));
    }),

  getVideosBySound: publicProcedure
    .input(z.object({ videoId: z.number().int().positive(), limit: z.number().int().min(1).max(50).default(30), offset: z.number().int().min(0).default(0) }))
    .query(async ({ input }) => {
      const sourceVideo = await getVideoById(input.videoId);
      if (!sourceVideo?.musicUrl) return [];

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
          eq(videos.musicUrl, sourceVideo.musicUrl),
          sql`${videos.visibility} = 'public'`,
          sql`${videos.videoUrl} IS NOT NULL`,
        ))
        .orderBy(desc(videos.createdAt))
        .limit(input.limit)
        .offset(input.offset);
    }),
});
