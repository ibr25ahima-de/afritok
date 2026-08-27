import { useMemo, useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, Image as ImageIcon, Video, Type, CheckCircle2, Megaphone } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";

const PACKAGES = {
  text: { label: "Texte", icon: Type, prices: { 7: 5000, 14: 9000, 21: 12000, 30: 15000 } },
  image: { label: "Photo", icon: ImageIcon, prices: { 7: 10000, 14: 18000, 21: 25000, 30: 30000 } },
  video: { label: "Vidéo", icon: Video, prices: { 7: 15000, 14: 28000, 21: 40000, 30: 50000 } },
} as const;

type AdType = keyof typeof PACKAGES;
type Duration = 7 | 14 | 21 | 30;
type Operator = "orange" | "mtn" | "moov" | "wave";

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
  const [operator, setOperator] = useState<Operator>("orange");
  const [message, setMessage] = useState<string | null>(null);

  const createCampaign = trpc.advertising.createCampaign.useMutation();
  const attachPayment = trpc.advertising.attachPayment.useMutation();
  const createPayment = trpc.payment.createPayment.useMutation();
  const price = useMemo(() => PACKAGES[adType].prices[duration], [adType, duration]);

  const handleSubmit = async () => {
    setMessage(null);
    if (!isAuthenticated || !user) { navigate("/login"); return; }
    if (!advertiserName.trim() || !name.trim()) { setMessage("Renseignez le nom de l'entreprise et le nom de la campagne."); return; }
    if (adType === "text" && !textContent.trim()) { setMessage("Ajoutez le texte de votre publicité."); return; }
    if ((adType === "image" || adType === "video") && !mediaUrl.trim()) { setMessage(`Ajoutez l'URL de votre ${adType === "image" ? "photo" : "vidéo"}.`); return; }
    if (!phone.trim()) { setMessage("Ajoutez le numéro Mobile Money à utiliser pour le paiement."); return; }

    try {
      const campaign = await createCampaign.mutateAsync({
        advertiserName: advertiserName.trim(), name: name.trim(), adType,
        textContent: adType === "text" ? textContent.trim() : undefined,
        imageUrl: adType === "image" ? mediaUrl.trim() : undefined,
        videoUrl: adType === "video" ? mediaUrl.trim() : undefined,
        destinationUrl: destinationUrl.trim() || undefined,
        budget: price, currency: "XOF", startDate: new Date(),
        endDate: new Date(Date.now() + duration * 86400000),
        targetCountry: country.trim() || undefined,
      });

      const payment = await createPayment.mutateAsync({ amount: price, currency: "XOF", operator, phone: phone.trim(), purpose: "advertisement" });
      await attachPayment.mutateAsync({ campaignId: campaign.id, paymentReference: payment.referenceId });
      setMessage(payment.success ? "Paiement lancé. Votre publicité sera publiée uniquement après confirmation réelle du paiement." : "Demande enregistrée. Votre publicité reste en attente et ne sera jamais diffusée avant la confirmation réelle du paiement.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible de créer la publicité.");
    }
  };

  const busy = createCampaign.isPending || attachPayment.isPending || createPayment.isPending;

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <header className="sticky top-0 z-20 bg-black/90 backdrop-blur border-b border-white/10 px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate("/feed")} className="p-2 rounded-full hover:bg-white/10"><ArrowLeft size={22} /></button>
        <div><h1 className="text-xl font-black text-amber-400">Faire de la publicité</h1><p className="text-xs text-gray-400">Présentez votre entreprise sur AfriTok</p></div>
      </header>
      <main className="max-w-xl mx-auto px-4 py-6 space-y-6">
        <section className="rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/20 via-black to-orange-500/10 p-6 text-center shadow-lg">
          <Megaphone className="mx-auto text-amber-400 mb-3" size={42} />
          <h2 className="text-2xl sm:text-3xl font-black leading-tight">PAYEZ POUR FAIRE LA PUBLICITÉ DE VOTRE ENTREPRISE, DE VOS PRODUITS OU DE VOTRE BOUTIQUE</h2>
          <p className="mt-3 text-sm text-gray-300">Choisissez votre format, votre durée et votre tarif. Remplissez votre publicité, puis payez. <strong className="text-white">L'envoi et la diffusion ne sont validés qu'après confirmation réelle du paiement.</strong></p>
        </section>

        <section>
          <h2 className="font-black text-lg mb-3">1. Choisissez ce que vous voulez publier</h2>
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(PACKAGES) as AdType[]).map((type) => { const item = PACKAGES[type]; const Icon = item.icon; return <button key={type} onClick={() => setAdType(type)} className={`rounded-2xl p-4 border text-center transition ${adType === type ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/5"}`}><Icon className="mx-auto mb-2" size={25} /><span className="font-bold">{item.label}</span></button>; })}
          </div>
        </section>

        <section>
          <h2 className="font-black text-lg mb-3">2. Choisissez la durée et le prix</h2>
          <div className="grid grid-cols-2 gap-2">
            {([7,14,21,30] as Duration[]).map((days) => <button key={days} onClick={() => setDuration(days)} className={`rounded-xl border p-4 text-left transition ${duration === days ? "border-amber-400 bg-amber-400/15" : "border-white/10 bg-white/5"}`}><div className="font-bold">{days === 30 ? "1 mois" : `${days / 7} semaine${days > 7 ? "s" : ""}`}</div><div className="text-amber-400 font-black mt-1">{formatXof(PACKAGES[adType].prices[days])}</div></button>)}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="font-black text-lg">3. Préparez votre publicité</h2>
          <input value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} placeholder="Nom de l'entreprise / marque" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nom de la campagne" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          {adType === "text" ? <textarea value={textContent} onChange={(e) => setTextContent(e.target.value)} placeholder="Écrivez votre publicité..." rows={5} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" /> : <input value={mediaUrl} onChange={(e) => setMediaUrl(e.target.value)} placeholder={`Lien de votre ${adType === "image" ? "photo" : "vidéo"}`} className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />}
          <input value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} placeholder="Lien vers votre entreprise / boutique (facultatif)" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
          <input value={country} onChange={(e) => setCountry(e.target.value)} placeholder="Pays ciblé (ex. CI) — facultatif" className="w-full rounded-xl bg-white/5 border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
        </section>

        <section className="rounded-2xl border border-white/10 bg-white/5 p-4 space-y-3">
          <h2 className="font-black">4. Paiement Mobile Money</h2>
          <select value={operator} onChange={(e) => setOperator(e.target.value as Operator)} className="w-full rounded-xl bg-black border border-white/10 px-4 py-3"><option value="orange">Orange Money</option><option value="mtn">MTN Mobile Money</option><option value="moov">Moov Money</option><option value="wave">Wave</option></select>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Numéro Mobile Money" className="w-full rounded-xl bg-black border border-white/10 px-4 py-3 outline-none focus:border-amber-400" />
        </section>

        <div className="rounded-2xl bg-amber-400 text-black p-5"><div className="flex justify-between items-center"><span className="font-bold">Prix à payer</span><span className="text-2xl font-black">{formatXof(price)}</span></div><button disabled={busy} onClick={handleSubmit} className="mt-4 w-full rounded-xl bg-black text-white py-4 font-black disabled:opacity-50">{busy ? "Traitement..." : "Envoyer et payer"}</button></div>

        {message && <div className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm flex gap-2 items-start"><CheckCircle2 size={18} className="text-amber-400 shrink-0 mt-0.5" /><span>{message}</span></div>}

        <section className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-gray-400 space-y-2">
          <h2 className="font-black text-white">Conditions de publicité AfriTok</h2>
          <p>• Le tarif dépend du format choisi et de la durée de diffusion.</p>
          <p>• Les campagnes sont contrôlées selon les règles publicitaires AfriTok.</p>
          <p>• Une campagne non payée ou dont le paiement n'est pas confirmé reste inactive.</p>
          <p>• Aucun contenu publicitaire n'est diffusé avant confirmation réelle du paiement.</p>
          <p>• La diffusion commence selon la période choisie et les règles de la plateforme.</p>
        </section>
      </main>
    </div>
  );
}
