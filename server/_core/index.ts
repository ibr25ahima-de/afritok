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
} from "../security";
import {
  ALLOWED_AVATAR_TYPES,
  ALLOWED_VIDEO_TYPES,
  hasValidMediaSignature,
} from "../security-upload";

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 10 },
});

const mediaUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024, files: 1, fields: 20 },
});

function allowedOrigins(): string[] {
  return (process.env.FRONTEND_URL || process.env.APP_URL || "")
    .split(",")
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
  runMigrations().catch((err) => console.error("Migration failed:", err));
  const app = express();
  app.set("trust proxy", 1);
  const server = createServer(app);

  app.use(helmetConfig);
  app.use(createRateLimiter(15 * 60 * 1000, 300));
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
  app.use(express.json({ limit: "1mb" }));
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
      const mimeType = req.file.mimetype.toLowerCase();
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

  app.post("/api/upload-video", uploadRateLimiter, mediaUpload.single("file"), async (req: Request, res: Response) => {
    try {
      const user = await getAuthenticatedUser(req, res);
      if (!user) return res.status(401).json({ error: "Utilisateur non authentifié." });
      if (!req.file) return res.status(400).json({ error: "Aucun fichier fourni." });
      const mimeType = req.file.mimetype.toLowerCase();
      if (!ALLOWED_VIDEO_TYPES.has(mimeType) || !hasValidMediaSignature(req.file.buffer, mimeType)) {
        return res.status(400).json({ error: "Format vidéo non autorisé ou fichier invalide." });
      }
      const extension = mimeType === "video/quicktime" ? "mov" : mimeType.split("/")[1];
      const fileName = `${randomUUID()}.${extension}`;
      const videoUrl = await uploadVideoToSupabase(req.file.buffer, fileName, user.id);
      return res.json({ videoUrl });
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
      const mimeType = req.file.mimetype.toLowerCase();
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

startServer().catch(console.error);
