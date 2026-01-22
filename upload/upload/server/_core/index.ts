import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";

const __dirname = new URL(".", import.meta.url).pathname;

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ==============================
  // 🔑 ENTRY POINT AUTH (OBLIGATOIRE)
  // ==============================
  app.get("/app-auth", (_req, res) => {
    const oauthUrl = process.env.OAUTH_SERVER_URL;
    if (!oauthUrl) {
      return res.status(500).send("OAuth server not configured");
    }
    res.redirect(302, oauthUrl);
  });

  // ==============================
  // Stripe webhooks
  // ==============================
  app.post(
    "/api/webhooks/stripe",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  app.post(
    "/api/webhooks/stripe/test",
    express.json(),
    testStripeWebhook
  );

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true }));

  // ==============================
  // OAuth callback
  // ==============================
  registerOAuthRoutes(app);

  // ==============================
  // tRPC API
  // ==============================
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ==============================
  // Frontend (Vite build)
  // ==============================
  const publicDir = path.join(__dirname, "../../dist/public");
  app.use(express.static(publicDir));

  // ==============================
  // SPA FALLBACK (navigation React)
  // ==============================
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api")) {
      res.sendFile(path.join(publicDir, "index.html"));
    } else {
      res.status(404).json({ error: "API endpoint not found" });
    }
  });

  const port = Number(process.env.PORT || 10000);
  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
  });
}

startServer().catch(console.error);
