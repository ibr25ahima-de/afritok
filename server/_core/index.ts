import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer } from "http";
import multer from "multer";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";
import { runMigrations } from "./migrate";
import { uploadVideoToSupabase } from "../supabase-storage";

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

async function startServer() {
  await runMigrations();

  const app = express();
  
  const server = createServer(app);

  app.use(cors({
    origin: true,
    credentials: true,
  }));

  app.use(cookieParser());

  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);
  app.post('/api/webhooks/stripe/test', express.json(), testStripeWebhook);

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  app.post('/api/upload-video', upload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const userId = req.body.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const file = req.file;

      if (!file.mimetype.startsWith("video/")) {
        return res.status(400).json({ error: "File must be a video" });
      }

      if (file.size > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large" });
      }

      const videoUrl = await uploadVideoToSupabase(
        file.buffer,
        file.originalname || "video.mp4",
        parseInt(userId)
      );

      return res.json({ videoUrl });

    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  app.use((req, res, next) => {
    console.log("COOKIES:", req.headers.cookie);
    next();
  });

  app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);


if (process.env.NODE_ENV === "development") {
  await setupVite(app, server);
} else {
  serveStatic(app);

  // ✅ FIX ROUTING FRONTEND (Render / SPA)
  app.get("*", (req: Request, res: Response) => {
    const path = require("path");
    res.sendFile(path.join(__dirname, "../dist/index.html"));
  });
}
  const port = parseInt(process.env.PORT || "3000");

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
