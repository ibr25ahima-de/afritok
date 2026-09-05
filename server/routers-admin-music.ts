import { router, adminProcedure } from "./_core/trpc";
import { db } from "./db";
import { music } from "../drizzle/schema";
import { z } from "zod";
import { storageList } from "./storage";
import { eq } from "drizzle-orm";

export const adminMusicRouter = router({
  uploadMusic: adminProcedure
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
      return { success: true };
    }),
  syncMusicLibrary: adminProcedure.mutation(async () => {
    const files = await storageList("music/");
    return { success: true, addedCount: files.length };
  }),
  deleteMusic: adminProcedure.input(z.object({ id: z.number() })).mutation(async ({ input }) => {
    await db.delete(music).where(eq(music.id, input.id));
    return { success: true };
  }),
});
