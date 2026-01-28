import express from "express";
import jwt from "jsonwebtoken";

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || "dev_secret";

// Stockage OTP temporaire (mémoire)
// ⚠️ OK pour démarrage / MVP
const OTP_STORE = new Map<string, string>();

/**
 * 📲 Demande OTP
 * POST /api/auth/request-otp
 */
router.post("/request-otp", (req, res) => {
  const { phone } = req.body;

  if (!phone || phone.length < 6) {
    return res.status(400).json({ error: "Invalid phone number" });
  }

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  OTP_STORE.set(phone, otp);

  // Visible dans les logs Render (temporaire)
  console.log(`[OTP] ${phone} => ${otp}`);

  return res.json({ success: true });
});

/**
 * ✅ Vérification OTP
 * POST /api/auth/verify-otp
 */
router.post("/verify-otp", (req, res) => {
  const { phone, code } = req.body;

  if (!phone || !code) {
    return res.status(400).json({ error: "Missing phone or code" });
  }

  const validCode = OTP_STORE.get(phone);

  if (validCode !== code) {
    return res.status(401).json({ error: "Invalid OTP code" });
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

/**
 * 🚪 Déconnexion
 * POST /api/auth/logout
 */
router.post("/logout", (_req, res) => {
  res.clearCookie("afritok_session");
  res.json({ success: true });
});

export default router;
