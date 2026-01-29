import "dotenv/config";
import express from "express";
import { createServer } from "http";
import cookieParser from "cookie-parser";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import { handleStripeWebhook, testStripeWebhook } from "../webhook-endpoint";

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ Stripe Webhook (DOIT être avant express.json)
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

  // ✅ Body parser
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // ✅ Cookies (OBLIGATOIRE pour auth OTP / JWT)
  app.use(cookieParser());

  // ✅ tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  // ✅ Dev / Prod
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ✅ PORT obligatoire (Render)
  const port = Number(process.env.PORT);
  if (!port) {
    throw new Error("PORT environment variable is not defined");
  }

  server.listen(port, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startServer().catch((err) => {
  console.error("❌ Server failed to start:", err);
  process.exit(1);
});
