import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

export default function Login() {
  const [, navigate] = useLocation();

  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [loading, setLoading] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null); // ✅ Store code to display

  const requestOtp = trpc.auth.requestOtp.useMutation();
  const verifyOtp = trpc.auth.verifyOtp.useMutation();
  const utils = trpc.useUtils();

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Numéro invalide");
      return;
    }

    setLoading(true);
    try {
      const result = await requestOtp.mutateAsync({ phone });
      setStep("otp");
      
      // ✅ Display the code on screen for testing
      if (result.code) {
        setDisplayCode(result.code);
        toast.success(`Code envoyé: ${result.code}`); // Show code in toast
      } else {
        toast.success("Code envoyé par SMS");
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi du code");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.length !== 6) {
      toast.error("Code invalide");
      return;
    }

    setLoading(true);
    try {
  const result = await verifyOtp.mutateAsync({
  phone,
  code: otp,
});

await utils.auth.me.invalidate();

if (result.isNewUser) {
  navigate("/edit-profile");
} else {
  navigate("/feed");
  }
    } catch (e: any) {
      toast.error(e?.message || "Code incorrect");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="text-center space-y-2">
          {APP_LOGO && (
            <img src={APP_LOGO} alt="logo" className="mx-auto h-10" />
          )}
          <h1 className="text-xl font-bold">{APP_TITLE}</h1>
        </div>

        {step === "phone" && (
          <>
            <Input
              placeholder="Numéro de téléphone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={loading}
            />
            <Button
              onClick={handleSendOtp}
              disabled={loading}
              className="w-full"
            >
              Recevoir le code
            </Button>
          </>
        )}

        {step === "otp" && (
          <>
            {/* ✅ Display the OTP code on screen */}
            {displayCode && (
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-center">
                <p className="text-xs text-gray-600 mb-1">Code de test:</p>
                <p className="text-2xl font-bold text-blue-600 tracking-widest">
                  {displayCode}
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Copie ce code et colle-le ci-dessous
                </p>
              </div>
            )}

            <Input
              placeholder="Code à 6 chiffres"
              value={otp}
              onChange={(e) =>
                setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              disabled={loading}
            />
            <Button
              onClick={handleVerifyOtp}
              disabled={loading}
              className="w-full"
            >
              Valider
            </Button>

            <button
              className="text-xs text-center underline"
              onClick={() => {
                setStep("phone");
                setOtp("");
                setDisplayCode(null);
              }}
              disabled={loading}
            >
              Changer de numéro
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
