import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { processPremiumHdVideo } from "./hd-pipeline";

/**
 * Starts Premium HD processing without blocking video publication.
 * The original video URL remains the source of truth if processing fails.
 */
export function queuePremiumHdVideo(input: {
  videoId: number;
  userId: number;
  videoUrl: string;
}): void {
  void (async () => {
    const workDir = join("/tmp/afritok-hd-source", String(input.userId));
    const sourcePath = join(workDir, `${input.videoId}-source`);

    try {
      await mkdir(dirname(sourcePath), { recursive: true });
      const response = await fetch(input.videoUrl);
      if (!response.ok) throw new Error(`Impossible de récupérer la vidéo source (${response.status}).`);
      const buffer = Buffer.from(await response.arrayBuffer());
      await writeFile(sourcePath, buffer);

      await processPremiumHdVideo({
        videoId: input.videoId,
        userId: input.userId,
        sourcePath,
      });
    } catch (error) {
      console.error("[Premium HD] Processing failed:", error);
    } finally {
      await unlink(sourcePath).catch(() => undefined);
    }
  })();
}
