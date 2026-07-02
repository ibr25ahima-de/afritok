import { router, protectedProcedure } from "./_core/trpc";
import { db } from "./db";
import { music } from "../drizzle/schema";
import { z } from "zod";
import { storageList } from "./storage";
import { eq } from "drizzle-orm";

export const adminMusicRouter = router({
  uploadMusic: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        artist: z.string(),
        audioUrl: z.string(),
        duration: z.number(),
        category: z.string(),
        coverUrl: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
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

      return {
        success: true,
      };
    }),

  syncMusicLibrary: protectedProcedure.mutation(async () => {
    const files = await storageList("musique");
    let addedCount = 0;

    for (const file of files) {
      // Vérifier si la musique existe déjà par son audioUrl
      const existing = await db
        .select()
        .from(music)
        .where(eq(music.audioUrl, file.url))
        .limit(1);

      if (existing.length === 0) {
        // Extraire le titre du nom du fichier (enlever l'extension)
        const title = file.name.split(".").slice(0, -1).join(".") || file.name;

        await db.insert(music).values({
          title: title,
          artist: "Artiste inconnu",
          audioUrl: file.url,
          duration: 0,
          category: "Général",
          coverUrl: null,
          plays: 0,
          isActive: true,
          createdAt: new Date().toISOString(),
        });
        addedCount++;
      }
    }

    return {
      addedCount,
    };
  }),
});
