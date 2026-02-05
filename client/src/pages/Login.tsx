import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Loader2, ArrowLeft, Phone, Lock } from "lucide-react";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

type LoginStep = "phone" | "otp";

export default function Login() {
  const [, navigate] = useLocation();

  const [step, setStep] = useState<LoginStep>("phone");
  const [phone, setPhone] = useState("");
  const [displayPhone, setDisplayPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const requestOtpMutation = trpc.auth.requestOtp.useMutation();
  const verifyOtpMutation = trpc.auth.verifyOtp.useMutation();
  const utils = trpc.useUtils();

  // ---------- HELPERS ----------

  const formatPhoneDisplay = (p: string) => {
    const d = p.replace(/\D/g, "");
    if (d.length >= 10) {
      return `+${d.slice(0, 3)} ${d.slice(3, 6)} ${d.slice(6, 9)} ${d.slice(9)}`;
    }
    return p;
  };

  // ---------- HANDLERS ----------

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (step === "phone") {
      if (!phone.trim()) {
        toast.error("Veuillez entrer un numéro de téléphone");
        return;
      }

      const digits = phone.replace(/\D/g, "");
      if (digits.length < 10) {
        toast.error("Numéro invalide");
        return;
      }

      setIsLoading(true);
      try {
        const result = await requestOtpMutation.mutateAsync({ phone });

        if (result.success) {
          setDisplayPhone(phone);
          toast.success("Code OTP envoyé");

          // ⚠️ IMPORTANT : changement d’étape sécurisé
          requestAnimationFrame(() => {
            setStep("otp");
          });

          if (result.code) {
            toast.info(`DEV OTP: ${result.code}`);
          }
        }
      } catch (err: any) {
        toast.error(err?.message || "Erreur lors de l’envoi du code");
      } finally {
        setIsLoading(false);
      }
    }

    if (step === "otp") {
      if (otp.length !== 6) {
        toast.error("Code OTP invalide");
        return;
      }

      setIsLoading(true);
      try {
        const result = await verifyOtpMutation.mutateAsync({
          phone: displayPhone,
          code: otp,
        });

        if (result.success) {
          toast.success("Connexion réussie");
          await utils.auth.me.invalidate();

          setTimeout(() => {
            navigate("/feed");
          }, 400);
        }
      } catch (err: any) {
        toast.error(err?.message || "OTP incorrect");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    setStep("phone");
    setOtp("");
    setDisplayPhone("");
  };

  // ---------- UI ----------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-slate-800/50 border-purple-800/50 backdrop-blur-md shadow-2xl">
        <div className="p-8 space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} className="h-8 w-8" />}
              <h1 className="text-2xl font-bold text-white">{APP_TITLE}</h1>
            </div>
            <p className="text-purple-300 text-sm">
              {step === "phone"
                ? "Entrez votre numéro"
                : "Entrez le code reçu"}
            </p>
          </div>

          {/* SINGLE FORM (IMPORTANT) */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {step === "phone" && (
              <>
                <label className="text-sm text-purple-200 flex gap-2 items-center">
                  <Phone className="w-4 h-4" />
                  Numéro de téléphone
                </label>

                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) =>
                    setPhone(e.target.value.replace(/[^\d+]/g, ""))
                  }
                  placeholder="+225 0500000000"
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Envoi...
                    </>
                  ) : (
                    "Envoyer le code OTP"
                  )}
                </Button>
              </>
            )}

            {step === "otp" && (
              <>
                <div className="text-center text-purple-300">
                  {formatPhoneDisplay(displayPhone)}
                </div>

                <label className="text-sm text-purple-200 flex gap-2 items-center">
                  <Lock className="w-4 h-4" />
                  Code OTP
                </label>

                <Input
                  value={otp}
                  onChange={(e) =>
                    setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  className="text-center text-2xl tracking-widest"
                  disabled={isLoading}
                />

                <Button
                  type="submit"
                  disabled={isLoading || otp.length !== 6}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Vérification...
                    </>
                  ) : (
                    "Vérifier & continuer"
                  )}
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={isLoading}
                  className="w-full"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Changer de numéro
                </Button>
              </>
            )}
          </form>
        </div>
      </Card>
    </div>
  );
}
