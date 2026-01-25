import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import jwt from "jsonwebtoken";

const __dirname = new URL(".", import.meta.url).pathname;

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
const OTP_STORE = new Map<string, string>();

// ======================
// AUTH — DEMANDE OTP
// ======================
app.post("/api/auth/request-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Code OTP 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Stockage temporaire (simple, efficace)
  OTP_STORE.set(phone, otp);

  // 📌 Visible dans Render Logs
  console.log(`[OTP] ${phone} => ${otp}`);

  // Plus tard : SMS réel (Africa’s Talking, Twilio…)
  return res.json({ success: true });
});

// ======================
// AUTH — VÉRIFICATION OTP
// ======================
app.post("/api/auth/verify-otp", (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: "Phone and code required" });
  }

  const validCode = OTP_STORE.get(phone);

  if (validCode !== code) {
    return res.status(401).json({ error: "Invalid code" });
  }

  // Nettoyage OTP
  OTP_STORE.delete(phone);

  // Création session JWT
  const token = jwt.sign(
    { phone },
    JWT_SECRET,
    { expiresIn: "30d" }
  );

  res.cookie("afritok_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });

  return res.json({ success: true });
});

// ======================
// FRONTEND (Vite build)
// ======================
const publicDir = path.join(__dirname, "../../dist/public");
app.use(express.static(publicDir));

// SPA fallback
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ======================
// START SERVER
// ======================
const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, () => {
  console.log(`Afritok running on http://localhost:${PORT}`);
});
