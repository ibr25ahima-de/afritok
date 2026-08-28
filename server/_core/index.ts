import { storagePut } from "../storage";
import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer } from "http";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";
import { runMigrations } from "./migrate";
import { uploadVideoToSupabase } from "../supabase-storage";
import { uploadAdvertisingMedia } from "../advertising/ad-media-upload-service";
import { getUserById, getUserEarnings, getPlatformStats } from "../db";
import { exec } from "child_process";
import paymentWebhookRouter from "../payments/payment-webhook-router";
import paymentTestRouter from "../payments/payment-test-router";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024 } });

async function logPlatformMoney() {
  try {
    const stats = await getPlatformStats();
    const userEarnings = await getUserEarnings(1);
    console.log("\n💰 ===== ARGENT PLATEFORME =====");
    console.log("💵 Total gagné :", stats.total);
    console.log("📅 Aujourd’hui :", stats.today);
    console.log("🔄 Transactions :", stats.transactions);
    console.log("👤 Ton solde (user 1):", userEarnings?.total || 0);
    console.log("================================\n");
  } catch (error) { console.error("logPlatformMoney error:", error); }
}

async function startServer() {
  runMigrations().catch((err) => console.error("Migration failed:", err));
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);
  app.use(cors({ origin: true, credentials: true }));
  app.use(cookieParser());
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);
  app.post('/api/webhooks/stripe/test', express.json(), testStripeWebhook);
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
  app.use("/api/payments", paymentWebhookRouter);
  app.use("/api/payments/test", paymentTestRouter);

  app.post("/api/upload-avatar", upload.single("file"), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      if (!req.file.mimetype.startsWith("image/")) return res.status(400).json({ error: "File must be an image" });
      const fileKey = `avatars/${Date.now()}-${req.file.originalname}`;
      const { url } = await storagePut(fileKey, req.file.buffer, req.file.mimetype);
      return res.json({ avatarUrl: url });
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  app.post('/api/upload-video', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "No file provided" });
      const userId = req.body.userId;
      if (!userId) return res.status(401).json({ error: "Unauthorized" });
      if (!req.file.mimetype.startsWith("video/")) return res.status(400).json({ error: "File must be a video" });
      if (req.file.size > 100 * 1024 * 1024) return res.status(400).json({ error: "File too large" });
      const videoUrl = await uploadVideoToSupabase(req.file.buffer, req.file.originalname || "video.mp4", parseInt(userId));
      return res.json({ videoUrl });
    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  // Upload dédié aux publicités : authentification par cookie + stockage permanent.
  app.post('/api/upload-ad-media', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });
      const cookieHeader = req.headers.cookie || "";
      const match = cookieHeader.match(/app_session_id=([^;]+)/);
      if (!match) return res.status(401).json({ error: "Utilisateur non authentifié." });
      const decoded = jwt.verify(match[1], process.env.JWT_SECRET || "secret") as { userId?: number };
      if (!decoded.userId) return res.status(401).json({ error: "Session invalide." });
      const dbUser = await getUserById(decoded.userId);
      if (!dbUser) return res.status(401).json({ error: "Utilisateur introuvable." });
      const result = await uploadAdvertisingMedia({
        buffer: req.file.buffer,
        originalName: req.file.originalname || "advertisement",
        mimeType: req.file.mimetype,
        userId: dbUser.id,
      });
      return res.json(result);
    } catch (error) {
      console.error("[Advertising upload] Error:", error);
      return res.status(400).json({ error: error instanceof Error ? error.message : "Upload publicitaire impossible." });
    }
  });

  app.use((req, res, next) => { console.log("COOKIES:", req.headers.cookie); next(); });
  app.get("/api/user/earnings", async (req: Request, res: Response) => {
    try { const data = await getUserEarnings(1); res.json(data); }
    catch (error) { console.error("earnings route error:", error); res.status(500).json({ error: "failed" }); }
  });
  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));
  app.get("/fix-db", async (req, res) => {
    exec("npx drizzle-kit migrate", (error, stdout) => {
      if (error) { console.error("❌ MIGRATION ERROR:", error); return res.send("Migration failed"); }
      console.log("✅ MIGRATION SUCCESS:", stdout); res.send("Database updated");
    });
  });
  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);
  const port = parseInt(process.env.PORT || "3000");
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
    setInterval(async () => { await logPlatformMoney(); }, 10000);
  });
}

startServer().catch(console.error);
