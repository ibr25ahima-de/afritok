import express from "express";
import crypto from "node:crypto";
import { runLocalFallback } from "./premium-hd-trigger";

const app = express();
const port = Number(process.env.PORT ?? 10001);
const token = process.env.AFRITOK_VIDEO_WORKER_TOKEN;
const maxRequestsPerMinute = 30;
const requestWindowMs = 60_000;
const requestCounts = new Map<string, { startedAt: number; count: number }>();
const MAX_RATE_LIMIT_KEYS = 10_000;
const MAX_CONCURRENT_JOBS = 2;
const MAX_QUEUED_JOBS = 20;
let activeJobs = 0;
const pendingJobs: Array<{ videoId: number; userId: number; videoUrl: string }> = [];
const queuedVideoIds = new Set<number>();

function drainJobs(): void {
  while (activeJobs < MAX_CONCURRENT_JOBS && pendingJobs.length > 0) {
    const job = pendingJobs.shift()!;
    activeJobs++;
    void runLocalFallback(job).finally(() => {
      activeJobs--;
      queuedVideoIds.delete(job.videoId);
      drainJobs();
    });
  }
}

app.disable("x-powered-by");
app.use(express.json({ limit: "64kb" }));

function safeTokenEquals(received: string | undefined): boolean {
  if (!token || !received) return false;
  const expected = Buffer.from(token);
  const actual = Buffer.from(received);
  return expected.length === actual.length && crypto.timingSafeEqual(expected, actual);
}

function allowRequest(ip: string): boolean {
  const now = Date.now();
  const current = requestCounts.get(ip);

  if (!current || now - current.startedAt >= requestWindowMs) {
    if (!current && requestCounts.size >= MAX_RATE_LIMIT_KEYS) {
      for (const [key, value] of requestCounts) {
        if (now - value.startedAt >= requestWindowMs) requestCounts.delete(key);
      }
      if (requestCounts.size >= MAX_RATE_LIMIT_KEYS) return false;
    }
    requestCounts.set(ip, { startedAt: now, count: 1 });
    return true;
  }
  if (current.count >= maxRequestsPerMinute) return false;
  current.count += 1;
  return true;
}

function isSafeSourceUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length < 1 || value.length > 2048) return false;
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

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "afritok-video-worker" });
});

app.post("/process", (req, res) => {
  if (!safeTokenEquals(req.header("x-afritok-worker-token"))) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  const ip = req.ip || "unknown";
  if (!allowRequest(ip)) {
    return res.status(429).json({ success: false, message: "Too many requests." });
  }

  const { videoId, userId, videoUrl } = req.body ?? {};
  if (!Number.isSafeInteger(videoId) || videoId <= 0 || !Number.isSafeInteger(userId) || userId <= 0 || !isSafeSourceUrl(videoUrl)) {
    return res.status(400).json({ success: false, message: "Invalid video processing request." });
  }

  if (queuedVideoIds.has(videoId)) {
    return res.status(202).json({ success: true, status: "processing", videoId });
  }
  if (pendingJobs.length >= MAX_QUEUED_JOBS) {
    return res.status(503).json({ success: false, message: "Video worker busy. Retry later." });
  }
  queuedVideoIds.add(videoId);
  pendingJobs.push({ videoId, userId, videoUrl });
  drainJobs();
  return res.status(202).json({ success: true, status: "processing", videoId });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[Video Worker] listening on port ${port}`);
});
