import { mkdir, writeFile, unlink } from "node:fs/promises";
import { dirname, join } from "node:path";
import { processPremiumHdVideo } from "./hd-pipeline";

const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
const SOURCE_FETCH_TIMEOUT_MS = 30_000;

function isSafeSourceUrl(value: string): boolean {
  if (!value || value.length > 2048) return false;
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return false;
  }
  if (url.protocol !== "https:") return false;
  const configuredStorage = process.env.SUPABASE_URL;
  if (!configuredStorage) return false;
  try {
    const allowed = new URL(configuredStorage);
    return url.hostname === allowed.hostname && url.port === allowed.port;
  } catch {
    return false;
  }
}

async function downloadSource(url: string): Promise<Buffer> {
  if (!isSafeSourceUrl(url)) throw new Error("Source vidéo non autorisée.");
  const response = await fetch(url, { signal: AbortSignal.timeout(SOURCE_FETCH_TIMEOUT_MS) });
  if (!response.ok) throw new Error(`Impossible de récupérer la vidéo source (${response.status}).`);
  const contentLength = Number(response.headers.get("content-length") ?? 0);
  if (contentLength > MAX_SOURCE_BYTES) throw new Error("Vidéo source trop volumineuse.");
  if (!response.body) throw new Error("Réponse vidéo vide.");

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SOURCE_BYTES) throw new Error("Vidéo source trop volumineuse.");
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

/**
 * Sends Premium HD work to the isolated worker when configured.
 * A bounded local fallback keeps development/test environments usable.
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
      signal: AbortSignal.timeout(10_000),
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
    const source = await downloadSource(input.videoUrl);
    await writeFile(sourcePath, source, { flag: "wx" });
    await processPremiumHdVideo({ videoId: input.videoId, userId: input.userId, sourcePath });
  } catch (error) {
    console.error("[Premium HD] Processing failed:", error);
  } finally {
    await unlink(sourcePath).catch(() => undefined);
  }
}
