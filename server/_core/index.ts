import { randomUUID } from "crypto";
import { storagePut } from "../storage";
import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer } from "http";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import { Server as SocketIOServer } from "socket.io";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook } from "../webhook-endpoint";
import { runMigrations } from "./migrate";
import { uploadVideoToSupabase } from "../supabase-storage";
import { uploadAdvertisingMedia } from "../advertising/ad-media-upload-service";
import { db } from "../db";
import { music } from "../../drizzle/schema";
import { registerLiveSocket } from "../live-socket";
import paymentWebhookRouter from "../payments/payment-webhook-router";
import paymentTestRouter from "../payments/payment-test-router";
import {
  createRateLimiter,
  csrfProtection,
  helmetConfig,
  securityLogger,
  validateInput,
  uploadRateLimiter,
  errorHandler,
  checkSecurityHeaders,
} from "../security";
import {
  ALLOWED_AVATAR_TYPES,
  ALLOWED_VIDEO_TYPES,
  ALLOWED_MEDIA_TYPES,
  hasValidMediaSignature,
  detectVideoMimeType,
} from "../security-upload";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
});

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 20 },
});

// Multipart audio upload avoids base64/JSON expansion and large in-memory copies.
const audioUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 30 * 1024 * 1024, files: 1, fields: 5 },
});

function allowedOrigins(): string[] {
  return [process.env.FRONTEND_URL, process.env.APP_URL, process.env.RENDER_EXTERNAL_URL]
    .filter(Boolean)
    .flatMap(value => (value as string).split(","))
    .map(value => value.trim())
    .filter(Boolean);
}

function isAllowedOrigin(origin?: string): boolean {
  if (!origin) return true;
  if (process.env.NODE_ENV === "development" && /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) {
    return true;
  }
  return allowedOrigins().includes(origin);
}

async function getAuthenticatedUser(req: Request, res: Response) {
  const context = await createContext({ req, res } as any);
  return context.user;
}

async function startServer() {
  // Database migrations must finish before the HTTP server starts accepting requests.
  // This prevents request-time schema creation from becoming a race/DoS condition.
  await runMigrations();

  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  app.use(helmetConfig);
  app.use(checkSecurityHeaders);
  // Limit API traffic without blocking page loads or static assets. Live sessions
  // legitimately poll several endpoints, so allow a larger shared API budget.
  app.use("/api", createRateLimiter(15 * 60 * 1000, 1200));
  app.use(csrfProtection);
  app.use(securityLogger);

  const corsOptions = {
    credentials: true,
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      callback(null, isAllowedOrigin(origin));
    },
  };

  const io = new SocketIOServer(server, { cors: corsOptions });
  registerLiveSocket(io);
  app.use(cors(corsOptions));
  app.use(cookieParser());

  app.post("/api/webhooks/stripe", express.raw({ type: "application/json" }), handleStripeWebhook);
  // video.uploadFile sends the recorded binary through the tRPC JSON
  // transformer; allow the configured 100 MB video limit plus encoding
  // overhead instead of silently stopping large uploads around the midpoint.
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "1mb", extended: true, parameterLimit: 100 }));
  app.use(validateInput);
  app.use("/api/payments", paymentWebhookRouter);
  if (process.env.NODE_ENV === "development") {
    app.use("/api/payments/test", paymentTestRouter);
  }

  app.post("/api/upload-avatar", uploadRateLimiter, avatarUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req, res);
      if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });
      const mimeType = req.file.mimetype.toLowerCase().split(";")[0].trim();
      if (!ALLOWED_AVATAR_TYPES.has(mimeType) || !hasValidMediaSignature(req.file.buffer, mimeType)) {
        return res.status(400).json({ error: "Format d'image non autorisé ou fichier invalide." });
      }
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1];
      const fileKey = `avatars/${user.id}/${randomUUID()}.${extension}`;
      const { url } = await storagePut(fileKey, req.file.buffer, mimeType);
      return res.json({ avatarUrl: url });
    } catch (error) {
      console.error("Avatar upload error:", error);
      return res.status(500).json({ error: "Upload impossible." });
    }
  });

  app.post("/api/admin/upload-music", uploadRateLimiter, audioUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req, res);
      if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
      if (user.role !== "admin") return res.status(403).json({ error: "Accès refusé." });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });

      const originalName = req.file.originalname || "musique.mp3";
      const extension = originalName.split(".").pop()?.toLowerCase() || "";
      const mimeByExtension: Record<string, string> = {
        mp3: "audio/mpeg", m4a: "audio/mp4", mp4: "audio/mp4", aac: "audio/aac",
        ogg: "audio/ogg", wav: "audio/wav", flac: "audio/flac", webm: "audio/webm",
      };
      const mimeType = mimeByExtension[extension];
      if (!mimeType) return res.status(400).json({ error: "Format audio non accepté." });

      const safeName = originalName.normalize("NFKD").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").slice(-180);
      const fileKey = `music/${Date.now()}-${safeName}`;
      const uploaded = await storagePut(fileKey, req.file.buffer, mimeType);
      const artist = typeof req.body?.artist === "string" ? req.body.artist.trim().slice(0, 200) : "";
      const title = originalName.replace(/\\.[^.]+$/, "").replace(/[-_]+/g, " ").trim();

      const [created] = await db.insert(music).values({
        title: title || "Musique sans titre",
        artist: artist || "Artiste non renseigné",
        audioUrl: uploaded.url,
        duration: 0,
        category: "Afritok",
        plays: 0,
        isActive: true,
        createdAt: new Date().toISOString(),
      }).returning({ id: music.id });

      return res.json({ success: true, id: created.id, audioUrl: uploaded.url });
    } catch (error) {
      console.error("[Admin music upload] Error:", error);
      return res.status(500).json({ error: error instanceof Error ? error.message : "Ajout de la musique impossible." });
    }
  });

  app.post("/api/upload-video", uploadRateLimiter, mediaUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req, res);
      if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });
      const claimedMimeType = req.file.mimetype.toLowerCase().split(";")[0].trim();
      // Mobile browsers can label MP4/WebM recordings inconsistently. Detect the
      // actual supported video container from its signature before validating it.
      const mimeType = detectVideoMimeType(req.file.buffer) || claimedMimeType;
      if (!ALLOWED_MEDIA_TYPES.has(mimeType) || !hasValidMediaSignature(req.file.buffer, mimeType)) {
        return res.status(400).json({ error: "Format média non autorisé ou fichier invalide." });
      }
      const extension = mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1];
      const fileName = `${randomUUID()}.${extension}`;
      const videoUrl = await uploadVideoToSupabase(req.file.buffer, fileName, user.id, mimeType);
      return res.json({ videoUrl, mediaType: mimeType.startsWith("image/") ? "image" : "video" });
    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({ error: "Upload impossible." });
    }
  });

  app.post("/api/upload-ad-media", uploadRateLimiter, mediaUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req, res);
      if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
      if (user.role !== "admin") return res.status(403).json({ error: "Accès refusé." });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });
      const mimeType = req.file.mimetype.toLowerCase().split(";")[0].trim();
      if (!(ALLOWED_AVATAR_TYPES.has(mimeType) || ALLOWED_VIDEO_TYPES.has(mimeType)) || !hasValidMediaSignature(req.file.buffer, mimeType)) {
        return res.status(400).json({ error: "Format de média non autorisé ou fichier invalide." });
      }
      const result = await uploadAdvertisingMedia({
        buffer: req.file.buffer,
        originalName: req.file.originalname || "advertisement",
        mimeType,
        userId: user.id,
      });
      return res.json(result);
    } catch (error) {
      console.error("[Advertising upload] Error:", error);
      return res.status(500).json({ error: "Upload publicitaire impossible." });
    }
  });

  app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

  if (process.env.NODE_ENV === "development") await setupVite(app, server);
  else serveStatic(app);

  app.use(errorHandler);

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch((error) => {
  console.error("Server startup failed:", error);
  process.exitCode = 1;
});
