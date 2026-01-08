import express, { Request, Response } from "express";

const app = express();

// Middleware de base
app.use(express.json());

// Port fourni par Render ou fallback local
const PORT = Number(process.env.PORT) || 3000;

app.get("/", (_req: Request, res: Response) => {
  res.status(200).send("Afritok backend is running 🚀");
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
});
