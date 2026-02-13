import { z } from "zod";
import { protectedProcedure } from "../trpc"; // Chemin à adapter selon votre structure
import { TRPCError } from "@trpc/server";
import { db } from "@/db"; // Chemin à adapter selon votre structure
import { videos } from "@/db/schema"; // Chemin à adapter selon votre structure
import { uploadVideoToStorage } from "@/lib/storage"; // Chemin à adapter selon votre structure

export const videoRouter = {
  upload: protectedProcedure
    .input(
      z.object({
        title: z.string(),
        description: z.string().optional(),
        videoFile: z.any(), // ✅ FIX NODE COMPATIBILITY
        thumbnailFile: z.any().optional(), // ✅ FIX NODE COMPATIBILITY
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
};
