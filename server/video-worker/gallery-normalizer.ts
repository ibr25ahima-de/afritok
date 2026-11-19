import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";

const MAX_SOURCE_BYTES = 100 * 1024 * 1024;
const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;

function storageClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("Missing Supabase storage credentials.");
  return { client: createClient(url, key), url: new URL(url) };
}

function getOwnedStoragePath(videoUrl: string, userId: number): string {
  const { url: storageUrl } = storageClient();
  const parsed = new URL(videoUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== storageUrl.hostname || parsed.port !== storageUrl.port) {
    throw new Error("Video source URL is not on the configured storage host.");
  }
  const marker = "/storage/v1/object/public/videos/";
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex < 0) throw new Error("Video source is not in the videos bucket.");
  const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  if (!path.startsWith(`${userId}/`) || path.includes("..") || path.length > 512) {
    throw new Error("Video source does not belong to the authenticated user.");
  }
  return path;
}

async function downloadSource(videoUrl: string): Promise<Buffer> {
  const response = await fetch(videoUrl, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok || !response.body) throw new Error(`Unable to download source video (${response.status}).`);
  const declared = Number(response.headers.get("content-length") ?? 0);
  if (declared > MAX_SOURCE_BYTES) throw new Error("Source video exceeds 100 MB.");
  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_SOURCE_BYTES) throw new Error("Source video exceeds 100 MB.");
      chunks.push(Buffer.from(value));
    }
  } finally {
    reader.releaseLock();
  }
  return Buffer.concat(chunks, total);
}

function transcodeForMobile(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const args = [
      "-y", "-i", inputPath,
      "-map", "0:v:0", "-map", "0:a?",
      "-c:v", "libx264", "-profile:v", "baseline", "-pix_fmt", "yuv420p",
      "-preset", "veryfast", "-crf", "23",
      "-c:a", "aac", "-b:a", "128k",
      "-movflags", "+faststart", outputPath,
    ];
    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("Video compatibility conversion timed out.")));
    }, FFMPEG_TIMEOUT_MS);
    child.stderr.on("data", chunk => {
      stderr += chunk.toString();
      if (stderr.length > 8000) stderr = stderr.slice(-8000);
    });
    child.once("error", error => finish(() => reject(error)));
    child.once("close", code => {
      if (code === 0) finish(resolve);
      else finish(() => reject(new Error(`FFmpeg conversion failed (${code}): ${stderr.slice(-2000)}`)));
    });
  });
}

/** Re-encodes an uploaded gallery file to broadly supported H.264/AAC MP4 in place. */
export async function normalizeGalleryVideo(videoUrl: string, userId: number): Promise<{ videoUrl: string; size: number }> {
  const path = getOwnedStoragePath(videoUrl, userId);
  const { client } = storageClient();
  const workDir = join("/tmp/afritok-gallery-normalize", String(userId), randomUUID());
  const inputPath = join(workDir, "source");
  const outputPath = join(workDir, "compatible.mp4");
  try {
    await mkdir(dirname(inputPath), { recursive: true });
    const source = await downloadSource(videoUrl);
    await writeFile(inputPath, source, { flag: "wx" });
    await transcodeForMobile(inputPath, outputPath);
    const converted = await readFile(outputPath);
    if (!converted.length || converted.length > MAX_SOURCE_BYTES) throw new Error("Converted video is empty or exceeds 100 MB.");
    const bucket = process.env.SUPABASE_VIDEO_BUCKET ?? "videos";
    const { error } = await client.storage.from(bucket).upload(path, converted, {
      contentType: "video/mp4",
      cacheControl: "31536000",
      upsert: true,
    });
    if (error) throw new Error(`Unable to save compatible video: ${error.message}`);
    return { videoUrl, size: converted.length };
  } finally {
    await unlink(inputPath).catch(() => undefined);
    await unlink(outputPath).catch(() => undefined);
  }
}
