import express, { Request, Response } from "express";

const app = express();

/**
 * Middleware de base
 */
app.use(express.json());

/**
 * Port fourni par Render (OBLIGATOIRE)
 * Fallback 3000 pour le local
 */
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;

/**
 * Route de test (health check)
 */
app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Afritok backend is running 🚀");
});

/**
 * Démarrage du serveur
 * IMPORTANT : écouter sur 0.0.0.0 pour Render
 */
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on port ${PORT}`);
});
