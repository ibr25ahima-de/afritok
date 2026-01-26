import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";

type Step = "phone" | "otp";

export default function Login() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendOtpMutation = trpc.auth.sendOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();

  const handleSendOtp = async () => {
    setError("");

    if (!phone.trim()) {
      setError("Veuillez entrer votre numéro de téléphone");
      return;
    }

    try {
      setLoading(true);
      await sendOtpMutation.mutateAsync({ phoneNumber: phone });
      setStep("otp");
    } catch (err) {
      setError("Impossible d'envoyer le code. Réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setError("");

    if (otpCode.length !== 6) {
      setError("Le code doit contenir 6 chiffres");
      return;
    }

    try {
      setLoading(true);
      await verifyOtpMutation.mutateAsync({ 
        phoneNumber: phone, 
        code: otpCode 
      });
      navigate("/feed");
    } catch (err) {
      setError("Code invalide. Réessayez.");
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

        {step === "phone" ? (
          <>
            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                Numéro de téléphone
              </label>
              <input
                type="tel"
                placeholder="Ex: +33700000000"
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
              onClick={handleSendOtp}
              disabled={loading || !phone.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Envoi..." : "Envoyer le code"}
            </Button>
          </>
        ) : (
          <>
            <p className="text-slate-300 text-center text-sm">
              Code envoyé à <strong>{phone}</strong>
            </p>

            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                Code de vérification (6 chiffres)
              </label>
              <input
                type="text"
                placeholder="000000"
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.slice(0, 6))}
                maxLength={6}
                className="w-full rounded-md bg-slate-900 border border-slate-600 px-3 py-2 text-white outline-none focus:border-purple-500 text-center text-2xl tracking-widest"
              />
            </div>

            {error && (
              <p className="text-red-400 text-sm text-center">
                {error}
              </p>
            )}

            <Button
              onClick={handleVerifyOtp}
              disabled={loading || otpCode.length !== 6}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Vérification..." : "Vérifier le code"}
            </Button>

            <Button
              variant="outline"
              onClick={() => {
                setStep("phone");
                setOtpCode("");
                setError("");
              }}
              className="w-full"
            >
              Changer le numéro
            </Button>
          </>
        )}

        <p className="text-xs text-slate-400 text-center">
          Pas de mot de passe. Simple et rapide.
        </p>
      </div>
    </div>
  );
}
