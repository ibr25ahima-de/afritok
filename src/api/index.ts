import "dotenv/config";
import express from "express";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerOAuthRoutes } from "../../oauth";
import { createContext } from "../../context";
import { appRouter } from "../../routers";
import {
  handleStripeWebhook,
  testStripeWebhook,
} from "../../webhook-endpoint";

const app = express();

/* Stripe Webhooks */
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

/* Middlewares */
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

/* OAuth */
registerOAuthRoutes(app);

/* tRPC */
app.use(
  "/api/trpc",
  createExpressMiddleware({
    router: appRouter,
    createContext,
  })
);

/* ⭐️ Obligatoire pour Vercel */
export default app;
