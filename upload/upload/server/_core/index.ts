import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import { createServer } from "http";
import jwt from "jsonwebtoken";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);

// ======================
// MIDDLEWARES
// ======================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// ======================
// CONFIG
// ======================
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const OTP_STORE = new Map<string, { code: string; expiresAt: number }>();

// ======================
// MIDDLEWARE — AUTHENTIFICATION
// ======================
declare global {
  namespace Express {
    interface Request {
      user?: { phone: string };
    }
  }
}

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const token = req.cookies?.afritok_session;

  if (!token) {
    return next();
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { phone: string };
    req.user = decoded;
  } catch (error) {
    // Token invalide, continuer sans utilisateur
  }

  next();
};

app.use(authMiddleware);

// ======================
// AUTH — DEMANDE OTP
// ======================
app.post("/api/auth/request-otp", (req: Request, res: Response) => {
  const { phone } = req.body;

  if (!phone || typeof phone !== "string") {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Valider format téléphone (simple)
  if (!/^\+?[1-9]\d{1,14}$/.test(phone)) {
    return res.status(400).json({ error: "Invalid phone format" });
  }

  // Code OTP 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Stockage temporaire avec expiration (10 minutes)
  const expiresAt = Date.now() + 10 * 60 * 1000;
  OTP_STORE.set(phone, { code: otp, expiresAt });

  // 📌 Visible dans les logs (développement)
  console.log(`[OTP] ${phone} => ${otp}`);

  // TODO: Envoyer SMS réel
  // - Africa's Talking
  // - Twilio
  // - AWS SNS
  // - Vonage

  return res.json({ success: true, message: "OTP sent" });
});

// ======================
// AUTH — VÉRIFICATION OTP
// ======================
app.post("/api/auth/verify-otp", (req: Request, res: Response) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: "Phone and code required" });
  }

  const stored = OTP_STORE.get(phone);

  // Vérifier existence
  if (!stored) {
    return res.status(401).json({ error: "No OTP requested for this phone" });
  }

  // Vérifier expiration
  if (stored.expiresAt < Date.now()) {
    OTP_STORE.delete(phone);
    return res.status(401).json({ error: "OTP expired" });
  }

  // Vérifier code
  if (stored.code !== code) {
    return res.status(401).json({ error: "Invalid code" });
  }

  // Nettoyage OTP
  OTP_STORE.delete(phone);

  // Création session JWT
  const token = jwt.sign({ phone }, JWT_SECRET, { expiresIn: "30d" });

  res.cookie("afritok_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true, message: "Logged in" });
});

// ======================
// AUTH — UTILISATEUR ACTUEL
// ======================
app.get("/api/auth/me", (req: Request, res: Response) => {
  if (!req.user) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  return res.json({ user: req.user });
});

// ======================
// AUTH — DÉCONNEXION
// ======================
app.post("/api/auth/logout", (req: Request, res: Response) => {
  res.clearCookie("afritok_session");
  return res.json({ success: true, message: "Logged out" });
});

// ======================
// FRONTEND (Vite build)
// ======================
const publicDir = path.join(__dirname, "../../dist/public");
app.use(express.static(publicDir));

// SPA fallback
app.get("*", (_req: Request, res: Response) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ======================
// ERROR HANDLING
// ======================
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error("[Error]", err);
  res.status(500).json({ error: "Internal server error" });
});

// ======================
// START SERVER
// ======================
const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, () => {
  console.log(`🚀 Afritok running on http://localhost:${PORT}`);
  console.log(`📱 Auth endpoints: /api/auth/request-otp, /api/auth/verify-otp`);
});
