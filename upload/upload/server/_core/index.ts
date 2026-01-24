import "dotenv/config";
import express from "express";
import path from "path";
import { createServer } from "http";
import jwt from "jsonwebtoken";

const __dirname = new URL(".", import.meta.url).pathname;

const app = express();
const server = createServer(app);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ======================
// CONFIG
// ======================
const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";
const OTP_STORE = new Map<string, string>();

// ======================
// AUTH — REQUEST OTP
// ======================
app.post("/api/auth/request-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone) {
    return res.status(400).json({ error: "Phone number required" });
  }

  // Générer code 6 chiffres
  const otp = Math.floor(100000 + Math.random() * 900000).toString();

  // Stockage temporaire (simple & efficace)
  OTP_STORE.set(phone, otp);

  console.log(`[OTP] ${phone} => ${otp}`); // 📌 visible dans les logs Render

  // PLUS TARD: SMS (Twilio, Africa’s Talking, etc.)
  return res.json({ success: true });
});

// ======================
// AUTH — VERIFY OTP
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

  OTP_STORE.delete(phone);

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

const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, () => {
  console.log(`Afritok running on http://localhost:${PORT}`);
});
