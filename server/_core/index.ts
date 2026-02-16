import "dotenv/config";
import express, { Request, Response } from "express";
import { createServer } from "http";
import net from "net";
import multer from "multer";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";
import { runMigrations } from "./migrate";
import { storagePut } from "../storage";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

// Configure multer for file uploads (in memory)
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB max
});

async function startServer() {
  // Run migrations BEFORE anything else
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Stripe webhooks (raw body)
  app.post('/api/webhooks/stripe', express.raw({type: 'application/json'}), handleStripeWebhook);
  app.post('/api/webhooks/stripe/test', express.json(), testStripeWebhook);

  // JSON parsing
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ============================================
  // VIDEO UPLOAD ENDPOINT
  // ============================================
  app.post('/api/upload-video', upload.single('file'), async (req: Request, res: Response) => {
    try {
      // Check if file is present
      if (!req.file) {
        return res.status(400).json({ error: "No file provided" });
      }

      // Get userId from body
      const userId = req.body.userId;
      if (!userId) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const file = req.file;

      // Validate file type
      if (!file.mimetype.startsWith("video/")) {
        return res.status(400).json({ error: "File must be a video" });
      }

      // Validate file size (100MB max)
      if (file.size > 100 * 1024 * 1024) {
        return res.status(400).json({ error: "File too large (max 100MB)" });
      }

      // Generate unique file key
      const fileKey = `videos/${userId}/${Date.now()}-${Math.random().toString(36).slice(2)}.mp4`;

      // Upload to storage
      const { url: videoUrl } = await storagePut(fileKey, file.buffer, file.mimetype);

      // Return the URL
      return res.json({ videoUrl });
    } catch (error) {
      console.error("[Upload] Error:", error);
      return res.status(500).json({ error: "Upload failed" });
    }
  });

  // tRPC endpoint
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
