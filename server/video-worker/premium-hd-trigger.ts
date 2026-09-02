import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { processPremiumHdVideo } from "./hd-pipeline";

/**
 * Sends Premium HD work to the isolated worker when configured.
 * A local fallback keeps development/test environments usable.
 */
export function queuePremiumHdVideo(input: {
  videoId: number;
  userId: number;
  videoUrl: string;
}): void {
  const workerUrl = process.env.AFRITOK_VIDEO_WORKER_URL?.replace(/\/$/, "");
  const workerToken = process.env.AFRITOK_VIDEO_WORKER_TOKEN;

  if (workerUrl && workerToken) {
    void fetch(`${workerUrl}/process`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-afritok-worker-token": workerToken,
      },
      body: JSON.stringify(input),
    }).then(async (response) => {
      if (!response.ok) throw new Error(`Worker HD indisponible (${response.status}).`);
    }).catch((error) => {
      console.error("[Premium HD] Worker request failed:", error);
    });
    return;
  }

  void runLocalFallback(input);
}

async function runLocalFallback(input: { videoId: number; userId: number; videoUrl: string }) {
  const workDir = join("/tmp/afritok-hd-source", String(input.userId));
  const sourcePath = join(workDir, `${input.videoId}-source`);

  try {
    await mkdir(dirname(sourcePath), { recursive: true });
    const response = await fetch(input.videoUrl);
    if (!response.ok) throw new Error(`Impossible de récupérer la vidéo source (${response.status}).`);
    await writeFile(sourcePath, Buffer.from(await response.arrayBuffer()));
    await processPremiumHdVideo({ videoId: input.videoId, userId: input.userId, sourcePath });
  } catch (error) {
    console.error("[Premium HD] Processing failed:", error);
  } finally {
    await unlink(sourcePath).catch(() => undefined);
  }
}
