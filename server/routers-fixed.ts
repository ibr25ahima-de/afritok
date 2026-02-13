import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { systemRouter } from "./_core/systemRouter";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";

// ✅ FIXED: Use relative imports instead of aliases
import { db } from "./db";
import { videos } from "../drizzle/schema";
import { storagePut } from "./storage";

export const videoUploadRouter = router({
  upload: protectedProcedure
    .input(
      z.object({
        title: z.string().min(1, "Title is required"),
        description: z.string().optional(),
        file: z.any(), // ✅ FIXED: Changed from videoFile to file
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!ctx.user) throw new TRPCError({ code: "UNAUTHORIZED" });

      try {
        // ✅ Validate file
        if (!input.file || !(input.file instanceof File)) {
          throw new Error("Invalid file");
        }

        // ✅ Convert File to Buffer
        const buffer = await input.file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // ✅ Upload to S3
        const fileKey = `videos/${ctx.user.id}/${Date.now()}-${input.file.name}`;
        const { url: videoUrl } = await storagePut(
          fileKey,
          uint8Array,
          input.file.type || "video/mp4"
        );

        // ✅ Insert video record
        const result = await db.insert(videos).values({
          userId: ctx.user.id,
          title: input.title,
          description: input.description || "",
          videoUrl,
          thumbnailUrl: "", // Optional for now
          duration: 0, // Optional for now
          isPublic: true,
        });

        return { 
          success: true, 
          videoId: result.insertId,
          videoUrl 
        };
      } catch (error) {
        console.error("[Video] Upload failed:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error instanceof Error ? error.message : "Failed to upload video",
        });
      }
    }),
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  // ✅ FIXED: Register videoUpload router
  videoUpload: videoUploadRouter,
});

export type AppRouter = typeof appRouter;
