import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export default function Login() {
  const [, navigate] = useLocation();
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    setError("");

    if (!phone.trim()) {
      setError("Veuillez entrer votre numéro de téléphone");
      return;
    }

    try {
      setLoading(true);

      // 👉 Appel backend (simple, local, stable)
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ phone }),
      });

      if (!res.ok) {
        throw new Error("Connexion échouée");
      }

      // ✅ Connecté → aller au feed
      navigate("/feed");
    } catch (err) {
      setError("Impossible de se connecter. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
      <div className="w-full max-w-md bg-slate-800 border border-slate-700 rounded-xl p-6 space-y-6">
        <h1 className="text-2xl font-bold text-white text-center">
          Connexion Afritok
        </h1>

        <div className="space-y-2">
          <label className="text-sm text-slate-300">
            Numéro de téléphone
          </label>
          <input
            type="tel"
            placeholder="Ex: 0700000000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-white outline-none focus:border-purple-500"
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">
            {error}
          </p>
        )}

        <Button
          onClick={handleLogin}
          disabled={loading}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
        >
          {loading ? "Connexion..." : "Se connecter"}
        </Button>

        <p className="text-xs text-slate-400 text-center">
          Pas de mot de passe. Simple et rapide.
        </p>
      </div>
    </div>
  );
          }
