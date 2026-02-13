import { z } from "zod";
import { router } from "./_core/trpc";
import { protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { db } from "@/db";
import { videos } from "@/db/schema";
import { uploadVideoToStorage } from "@/lib/storage";

export const videoRouter = router({
  upload: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        videoFile: z.any(),
        thumbnailFile: z.any().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        const { videoUrl, thumbnailUrl, duration } =
          await uploadVideoToStorage(input.videoFile, input.thumbnailFile);

        const result = await db.insert(videos).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description,
          videoUrl,
          thumbnailUrl,
          duration,
          isPublic: true,
        });

        return { success: true, videoId: result.insertId };
      } catch (error) {
        console.error("[Video] Upload failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload video",
        });
      }
    }),
});

export const appRouter = router({
  video: videoRouter,
});

export type AppRouter = typeof appRouter;
