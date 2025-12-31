import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";

import { registerOAuthRoutes } from "./oauth";
import { createContext } from "./context";
import { appRouter } from "./routers";
import { handleStripeWebhook, testStripeWebhook } from "./webhook-endpoint";

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
  return startPort;
}

async function startServer() {
  const app = express();
  const server = createServer(app);

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
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );

  const port = await findAvailablePort(
    parseInt(process.env.PORT || "3000")
  );

  server.listen(port, () => {
    console.log(`✅ Server running on port ${port}`);
  });
}

startServer().catch(console.error);
