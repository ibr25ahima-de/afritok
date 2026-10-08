import { useState } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { APP_LOGO, APP_TITLE } from "@/const";

type Mode = "choose" | "register" | "login" | "recover";
type Step = "identity" | "phone" | "otp";

export default function Login() {
  const [, navigate] = useLocation();
  const [mode, setMode] = useState<Mode>("choose");
  const [step, setStep] = useState<Step>("identity");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [displayCode, setDisplayCode] = useState<string | null>(null);

  const requestOtp = trpc.auth.requestOtp.useMutation();
  const verifyOtp = trpc.auth.verifyOtp.useMutation();
  const updateProfile = trpc.user.updateProfile.useMutation();
  const utils = trpc.useUtils();
  const { data: countries = [] } = trpc.country.list.useQuery();

  const startMode = (nextMode: Mode) => {
    setMode(nextMode);
    setStep(nextMode === "register" ? "identity" : "phone");
    setFirstName("");
    setLastName("");
    setCountryCode("");
    setPhone("");
    setOtp("");
    setDisplayCode(null);
  };

  const handleContinueToPhone = () => {
    if (!firstName.trim() || !lastName.trim()) {
      toast.error("Veuillez entrer votre prénom et votre nom.");
      return;
    }
    if (!countryCode) {
      toast.error("Veuillez choisir votre pays.");
      return;
    }
    setStep("phone");
  };

  const handleSendOtp = async () => {
    if (!phone.trim()) {
      toast.error("Veuillez entrer votre numéro de téléphone.");
      return;
    }

    setLoading(true);
    try {
      const result = await requestOtp.mutateAsync({ phone });
      setStep("otp");
      if (result.code) {
        setDisplayCode(result.code);
        toast.success(`Code de test : ${result.code}`);
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
      toast.error("Le code doit contenir 6 chiffres.");
      return;
    }

    setLoading(true);
    try {
      const result = await verifyOtp.mutateAsync({ phone, code: otp });
      if (result.isNewUser && mode === "register") {
        const selectedCountry = countries.find((country: any) => country.code === countryCode);
        await updateProfile.mutateAsync({
          name: `${firstName.trim()} ${lastName.trim()}`,
          country: selectedCountry?.name || "",
          countryCode,
        });
      }
      await utils.auth.me.invalidate();
      if (result.isNewUser && mode !== "register") {
        navigate("/edit-profile");
      } else {
        navigate("/feed");
      }
    } catch (e: any) {
      toast.error(e?.message || "Impossible de vérifier le code.");
    } finally {
      setLoading(false);
    }
  };

  const isRegistration = mode === "register";

  return (
    <div className="min-h-[100dvh] flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-sm p-6 space-y-4">
        <div className="text-center space-y-2">
          {APP_LOGO && <img src={APP_LOGO} alt="logo" className="mx-auto h-10" />}
          <h1 className="text-xl font-bold">{APP_TITLE}</h1>
        </div>

        {mode === "choose" && (
          <div className="space-y-3">
            <p className="text-center text-sm text-muted-foreground">Bienvenue ! Que souhaitez-vous faire ?</p>
            <Button onClick={() => startMode("register")} className="w-full">Créer un compte</Button>
            <Button onClick={() => startMode("login")} variant="outline" className="w-full">Se connecter</Button>
            <Button onClick={() => startMode("recover")} variant="outline" className="w-full">Récupérer mon compte</Button>
          </div>
        )}

        {mode !== "choose" && (
          <>
            <div className="text-center">
              <h2 className="font-semibold">
                {mode === "register" ? "Créer mon compte" : mode === "recover" ? "Récupérer mon compte" : "Se connecter"}
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                {mode === "register"
                  ? "Renseignez votre identité et votre pays avant de vérifier votre numéro."
                  : "Utilisez le numéro de téléphone associé à votre compte AfriTok."}
              </p>
            </div>

            {step === "identity" && isRegistration && (
              <div className="space-y-3">
                <Input
                  placeholder="Prénom"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={loading}
                  autoComplete="given-name"
                />
                <Input
                  placeholder="Nom"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={loading}
                  autoComplete="family-name"
                />
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  disabled={loading}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                >
                  <option value="">Choisir votre pays</option>
                  {countries.map((country: any) => (
                    <option key={country.code} value={country.code}>{country.name}</option>
                  ))}
                </select>
                <Button onClick={handleContinueToPhone} disabled={loading} className="w-full">
                  Continuer
                </Button>
              </div>
            )}

            {step === "phone" && (
              <div className="space-y-3">
                <Input
                  placeholder="Numéro de téléphone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={loading}
                  autoComplete="tel"
                />
                <Button onClick={handleSendOtp} disabled={loading} className="w-full">
                  {loading ? "Envoi..." : "Recevoir le code"}
                </Button>
              </div>
            )}

            {step === "otp" && (
              <div className="space-y-3">
                {displayCode && (
                  <div className="rounded border border-blue-200 bg-blue-50 p-3 text-center">
                    <p className="mb-1 text-xs text-gray-600">Code de test (SMS réel non branché)</p>
                    <p className="text-2xl font-bold tracking-widest text-blue-600">{displayCode}</p>
                    <p className="mt-2 text-xs text-gray-500">Saisissez ce code ci-dessous.</p>
                  </div>
                )}
                <Input
                  placeholder="Code à 6 chiffres"
                  inputMode="numeric"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  disabled={loading}
                  autoComplete="one-time-code"
                />
                <Button onClick={handleVerifyOtp} disabled={loading} className="w-full">
                  {loading ? "Vérification..." : "Valider et continuer"}
                </Button>
                <button
                  type="button"
                  className="w-full text-center text-xs underline"
                  onClick={() => {
                    setStep("phone");
                    setOtp("");
                    setDisplayCode(null);
                  }}
                  disabled={loading}
                >
                  Changer de numéro
                </button>
              </div>
            )}

            <button
              type="button"
              className="w-full text-center text-xs underline text-muted-foreground"
              onClick={() => startMode("choose")}
              disabled={loading}
            >
              Retour aux options
            </button>
          </>
        )}
      </Card>
    </div>
  );
}
