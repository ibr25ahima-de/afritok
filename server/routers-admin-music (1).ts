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
    console.log("🎵 [Sync] Starting music library synchronization...");
    
    try {
      const files = await storageList("musique");
      console.log(`📂 [Sync] Found ${files.length} files in 'musique' bucket.`);
      
      if (files.length === 0) {
        console.log("⚠️ [Sync] No files found in Supabase storage.");
      }

      let addedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;

      for (const file of files) {
        try {
          // Check if already exists
          const existing = await db
            .select()
            .from(music)
            .where(eq(music.audioUrl, file.url))
            .limit(1);

          if (existing.length === 0) {
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
            
            console.log(`✅ [Sync] Inserted: ${title}`);
            addedCount++;
          } else {
            skippedCount++;
          }
        } catch (itemError) {
          console.error(`❌ [Sync] Error processing file ${file.name}:`, itemError);
          errorCount++;
        }
      }

      console.log(`✨ [Sync] Completed: ${addedCount} added, ${skippedCount} skipped, ${errorCount} errors.`);
      
      return {
        success: true,
        addedCount,
        skippedCount,
        errorCount,
        totalFiles: files.length
      };
    } catch (error) {
      console.error("❌ [Sync] Critical failure during synchronization:", error);
      throw error;
    }
  }),
});
