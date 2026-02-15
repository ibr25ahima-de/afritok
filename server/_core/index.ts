import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";
import { runMigrations } from "./migrate";

async function startServer() {
  // Run migrations BEFORE anything else
  await runMigrations();

  const app = express();
  const server = createServer(app);

  // Stripe webhooks
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

  // Body parsers
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // tRPC
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // Dev or Prod
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ IMPORTANT: Correct port handling for Render
  const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
