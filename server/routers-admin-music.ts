import { router, adminProcedure } from "./_core/trpc";
import { db } from "./db";
import { music } from "../drizzle/schema";
import { z } from "zod";
import { storageList } from "./storage";
import { eq } from "drizzle-orm";

export const adminMusicRouter = router({
  uploadMusic: adminProcedure
    .input(z.object({
      title: z.string().trim().min(1).max(200),
      artist: z.string().trim().min(1).max(200),
      audioUrl: z.string().url(),
      duration: z.number().int().min(0),
      category: z.string().trim().min(1).max(50),
      coverUrl: z.string().url().optional(),
    }))
    .mutation(async ({ input }) => {
      const [existing] = await db.select({ id: music.id }).from(music)
        .where(eq(music.audioUrl, input.audioUrl)).limit(1);
      if (existing) return { success: true, alreadyExists: true };
      await db.insert(music).values({
        title: input.title,
        artist: input.artist,
        audioUrl: input.audioUrl,
        duration: input.duration,
        category: input.category,
        coverUrl: input.coverUrl ?? null,
        plays: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      return { success: true };
    }),

  syncMusicLibrary: adminProcedure.mutation(async () => {
    // Music audio files are stored under videos/music/ in the current Supabase project.
    const files = await storageList("videos", "music");
    let addedCount = 0;
    for (const file of files) {
      if (!/\.(mp3|m4a|aac|ogg|wav|flac)$/i.test(file.name)) continue;
      const [existing] = await db.select({ id: music.id }).from(music)
        .where(eq(music.audioUrl, file.url)).limit(1);
      if (existing) continue;
      const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();
      await db.insert(music).values({
        title: title || "Musique sans titre",
        artist: "Artiste non renseigné",
        audioUrl: file.url,
        duration: 0,
        category: "À classer",
        plays: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      });
      addedCount++;
    }
    return { success: true, addedCount };
  }),

  deleteMusic: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await db.delete(music).where(eq(music.id, input.id));
      return { success: true };
    }),
});
