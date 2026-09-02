import { mkdir, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { db } from "../db";
import { videos } from "../../drizzle/schema";
import { eq, sql } from "drizzle-orm";
import { transcodeToHd } from "./ffmpeg-transcoder";
import { uploadHdVideoToStorage } from "./hd-storage";

export type HdPipelineResult = {
  videoId: number;
  status: "completed" | "failed";
  hdUrl?: string;
  error?: string;
};

/**
 * Runs the Premium HD pipeline without replacing the original video.
 * The original URL remains the fallback if any HD step fails.
 */
export async function processPremiumHdVideo(input: {
  videoId: number;
  userId: number;
  sourcePath: string;
}): Promise<HdPipelineResult> {
  const outputPath = join("/tmp/afritok-hd", String(input.userId), `${input.videoId}.mp4`);

  try {
    await mkdir(dirname(outputPath), { recursive: true });
    await transcodeToHd({ inputPath: input.sourcePath, outputPath });

    const stored = await uploadHdVideoToStorage({
      localPath: outputPath,
      userId: input.userId,
      videoId: input.videoId,
    });

    await db.execute(sql`ALTER TABLE "videos" ADD COLUMN IF NOT EXISTS "hdVideoUrl" text`);
    await db.update(videos)
      .set({ updatedAt: new Date().toISOString() })
      .where(eq(videos.id, input.videoId));
    await db.execute(sql`UPDATE "videos" SET "hdVideoUrl" = ${stored.publicUrl} WHERE "id" = ${input.videoId}`);

    return { videoId: input.videoId, status: "completed", hdUrl: stored.publicUrl };
  } catch (error) {
    return {
      videoId: input.videoId,
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    await unlink(outputPath).catch(() => undefined);
  }
}
