import express from "express";
import { queuePremiumHdVideo } from "./premium-hd-trigger";

const app = express();
const port = Number(process.env.PORT ?? 10001);
const token = process.env.AFRITOK_VIDEO_WORKER_TOKEN;

app.use(express.json({ limit: "64kb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "afritok-video-worker" });
});

app.post("/process", (req, res) => {
  if (!token || req.header("x-afritok-worker-token") !== token) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }

  const { videoId, userId, videoUrl } = req.body ?? {};
  if (!Number.isInteger(videoId) || !Number.isInteger(userId) || typeof videoUrl !== "string" || !videoUrl) {
    return res.status(400).json({ success: false, message: "videoId, userId et videoUrl sont requis." });
  }

  queuePremiumHdVideo({ videoId, userId, videoUrl });
  return res.status(202).json({ success: true, status: "processing", videoId });
});

app.listen(port, "0.0.0.0", () => {
  console.log(`[Video Worker] listening on port ${port}`);
});
