import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Image, Video, Type, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const PACKAGES = {
  text: {
    label: "Texte",
    icon: Type,
    prices: { 7: 5000, 14: 9000, 21: 12000, 30: 15000 },
  },
  image: {
    label: "Image",
    icon: Image,
    prices: { 7: 10000, 14: 18000, 21: 25000, 30: 30000 },
  },
  video: {
    label: "Vidéo",
    icon: Video,
    prices: { 7: 15000, 14: 28000, 21: 40000, 30: 50000 },
  },
} as const;

type AdType = keyof typeof PACKAGES;
type Duration = 7 | 14 | 21 | 30;

function formatXof(value: number) {
  return `${value.toLocaleString("fr-FR")} XOF`;
}

export default function Advertising() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [adType, setAdType] = useState<AdType>("image");
  const [duration, setDuration] = useState<Duration>(7);
  const [advertiserName, setAdvertiserName] = useState(user?.name || "");
  const [name, setName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [mediaUrl, setMediaUrl] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [country, setCountry] = useState(user?.country || "");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<"orange_money" | "mtn_money" | "moov_money" | "wave">("orange_money");
  const [message, setMessage] = useState<string | null>(null);

  const createCampaign = trpc.advertising.createCampaign.useMutation();
  const attachPayment = trpc.advertising.attachPayment.useMutation();
  const createPayment = trpc.payment.createPayment.useMutation();

  const price = useMemo(() => PACKAGES[adType].prices[duration], [adType, duration]);

  const startDate = new Date();
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + duration);

  const handleSubmit = async () => {
    setMessage(null);
    if (!isAuthenticated || !user) {
      navigate("/login");
      return;
    }

    if (!advertiserName.trim() || !name.trim()) {
      setMessage("Renseignez le nom de l'entreprise et le nom de la campagne.");
      return;
    }

    if (adType === "text" && !textContent.trim()) {
      setMessage("Ajoutez le texte de votre publicité.");
      return;
    }

    if ((adType === "image" || adType === "video") && !mediaUrl.trim()) {
      setMessage(`Ajoutez l'URL de votre ${adType === "image" ? "image" : "vidéo"}.`);
      return;
    }

    if (!phone.trim()) {
      setMessage("Ajoutez le numéro Mobile Money à utiliser pour le paiement.");
      return;
    }

    try {
      const campaign = await createCampaign.mutateAsync({
        advertiserName: advertiserName.trim(),
        name: name.trim(),
        adType,
        textContent: adType === "text" ? textContent.trim() : undefined,
        imageUrl: adType === "image" ? mediaUrl.trim() : undefined,
        videoUrl: adType === "video" ? mediaUrl.trim() : undefined,
        destinationUrl: destinationUrl.trim() || undefined,
        budget: price,
        currency: "XOF",
        startDate,
        endDate,
        targetCountry: country.trim() || undefined,
      });

      const payment = await createPayment.mutateAsync({
        amount: price,
        currency: "XOF",
        operator,
        phone: phone.trim(),
        purpose: "advertisement",
      });

      await attachPayment.mutateAsync({
        campaignId: campaign.id,
        paymentReference: payment.referenceId,
      });

      setMessage(
        payment.success
          ? "Paiement lancé. La campagne sera activée après confirmation réelle du paiement."
          : "Campagne enregistrée. Le paiement est en attente : elle ne sera pas diffusée avant confirmation réelle du paiement."
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer la publicité.");
    }
  };

  const busy = createCampaign.isPending || attachPayment.isPending || createPayment.isPending;

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/feed")} className="p-2 rounded-full hover:bg-white/10">
          <ArrowLeft size={22} />
        </button>
        <div>
          <h1 className="text-xl font-black text-amber-400">Faire de la publicité</h1>
          <p className="text-xs text-gray-400">Présentez votre entreprise sur AfriTok</p>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <h2 className="font-bold text-lg">Choisissez votre formule</h2>
          <p className="text-sm text-gray-300 mt-1">Le prix affiché correspond à toute la durée de diffusion.</p>
        </section>

        <div className="grid grid-cols-3 gap-2">
          {(Object.keys(PACKAGES) as AdType[]).map((type) => {
            const item = PACKAGES[type];
            const Icon = item.icon;
            const selected = adType === type;
            return (
              <button key={type} onClick={() => setAdType(type)} className={`rounded-2xl p-4 border text-center ${selected ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/5"}`}>
                <Icon className="mx-auto mb-2" size={24} />
                <span className="font-bold">{item.label}</span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {([7, 14, 21, 30] as Duration[]).map((days) => (
            <button key={days} onClick={() => setDuration(days)} className={`rounded-xl border p-3 text-left ${duration === days ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/5"}`}>
              <div className="font-bold">{days === 30 ? "1 mois" : `${days / 7} semaine${days > 7 ? "s" : ""}`}</div>
              <div className="text-amber-400 font-black mt-1">{formatXof(PACKAGES[adType].prices[days])}</div>
            </button>
          ))}
        </div>

        <section className="space-y-3">
          <input value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} placeholder="Nom de l'entreprise / marque" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la campagne" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          {adType === "text" ? (
            <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Écrivez votre publicité..." rows={5} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          ) : (
            <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder={`URL de votre ${adType === "image" ? "photo" : "vidéo"}`} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          )}
          <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="Lien de destination (facultatif)" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays ciblé (ex. CI) — facultatif" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="font-bold">Paiement Mobile Money</h2>
          <select value={operator} onChange={(e) => setOperator(e.target.value as typeof operator)} className="w-full rounded-xl bg-black border border-white/10 px-4 py-3">
            <option value="orange_money">Orange Money</option>
            <option value="mtn_money">MTN Mobile Money</option>
            <option value="moov_money">Moov Money</option>
            <option value="wave">Wave</option>
          </select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money" className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
        </section>

        <div className="rounded-2xl bg-amber-400 text-black p-5">
          <div className="flex justify-between items-center">
            <span className="font-bold">Total</span>
            <span className="text-2xl font-black">{formatXof(price)}</span>
          </div>
          <button disabled={busy} onClick={handleSubmit} className="mt-4 w-full rounded-xl bg-black text-white py-4 font-black disabled:opacity-50">
            {busy ? "Traitement..." : "Envoyer et payer"}
          </button>
        </div>

        {message && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm flex gap-2 items-start">
            <CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" />
            <span>{message}</span>
          </div>
        )}

        <p className="text-xs text-gray-500 text-center">
          Une publicité n'est diffusée qu'après confirmation réelle du paiement et selon les règles de diffusion AfriTok.
        </p>
      </main>
    </div>
  );
}
