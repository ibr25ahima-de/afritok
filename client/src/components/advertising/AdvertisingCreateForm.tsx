import { useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";
import AdMediaPicker from "./AdMediaPicker";

const DURATIONS = [
  { key: "1w", label: "1 semaine", price: 15000 },
  { key: "2w", label: "2 semaines", price: 28000 },
  { key: "3w", label: "3 semaines", price: 40000 },
  { key: "1m", label: "1 mois", price: 50000 },
] as const;

type Format = "text" | "image" | "video";

export default function AdvertisingCreateForm() {
  const [format, setFormat] = useState<Format>("text");
  const [duration, setDuration] = useState<(typeof DURATIONS)[number]>(DURATIONS[0]);
  const [campaignName, setCampaignName] = useState("");
  const [advertiserName, setAdvertiserName] = useState("");
  const [textContent, setTextContent] = useState("");
  const [destinationUrl, setDestinationUrl] = useState("");
  const [country, setCountry] = useState("");
  const [phone, setPhone] = useState("");
  const [operator, setOperator] = useState<"orange_money" | "mtn_money">("orange_money");
  const [paymentConfirmed, setPaymentConfirmed] = useState(false);
  const [paymentReference, setPaymentReference] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState(false);

  const createCampaign = trpc.advertising.createCampaign.useMutation();
  const createPayment = trpc.payment.createPayment.useMutation();
  const attachPayment = trpc.advertising.attachPayment.useMutation();

  const canPrepare = useMemo(() => {
    if (!advertiserName.trim() || !campaignName.trim()) return false;
    if (format === "text") return textContent.trim().length > 0;
    return !!selectedFile;
  }, [advertiserName, campaignName, format, textContent, selectedFile]);

  const handlePay = async () => {
    if (!canPrepare || !phone.trim()) return;
    setMessage("");
    setPaymentConfirmed(false);
    try {
      const payment = await createPayment.mutateAsync({
        amount: duration.price,
        currency: "XOF",
        operator,
        phone: phone.trim(),
        purpose: "advertisement",
      });
      setPaymentReference(payment.referenceId);
      if (payment.status === "success") {
        setPaymentConfirmed(true);
        setMessage("Paiement confirmé. Vous pouvez maintenant envoyer votre publicité.");
      } else {
        setMessage("Paiement créé mais pas encore confirmé. La publicité reste inactive.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Le paiement n'a pas pu être créé.");
    }
  };

  const uploadAdMedia = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/upload-ad-media", {
      method: "POST",
      credentials: "include",
      body: formData,
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.url) {
      throw new Error(data.error || "Impossible d'envoyer le média publicitaire.");
    }
    return data.url as string;
  };

  const handleSubmit = async () => {
    if (!paymentConfirmed || !paymentReference || !canPrepare) return;
    setMessage("");

    try {
      setUploading(format !== "text");
      let mediaUrl: string | undefined;
      if (format !== "text") {
        if (!selectedFile) throw new Error("Sélectionnez d'abord une photo ou une vidéo.");
        mediaUrl = await uploadAdMedia(selectedFile);
      }

      const startDate = new Date();
      const endDate = new Date(startDate);
      const days = duration.key === "1w" ? 7 : duration.key === "2w" ? 14 : duration.key === "3w" ? 21 : 30;
      endDate.setDate(endDate.getDate() + days);

      const campaign = await createCampaign.mutateAsync({
        advertiserName: advertiserName.trim(),
        name: campaignName.trim(),
        adType: format,
        textContent: format === "text" ? textContent.trim() : undefined,
        imageUrl: format === "image" ? mediaUrl : undefined,
        videoUrl: format === "video" ? mediaUrl : undefined,
        destinationUrl: destinationUrl.trim() || undefined,
        budget: duration.price,
        currency: "XOF",
        startDate,
        endDate,
        targetCountry: country.trim() || undefined,
      });

      await attachPayment.mutateAsync({ campaignId: campaign.id, paymentReference });
      setMessage("Publicité envoyée. Elle reste inactive jusqu'à la confirmation réelle du paiement et aux contrôles prévus.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Impossible d'envoyer la publicité.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-lg rounded-3xl bg-white p-5 text-black shadow-xl">
      <h1 className="text-3xl font-black">Faire de la publicité</h1>
      <p className="mt-1 text-lg font-bold">Présentez votre entreprise sur AfriTok</p>
      <p className="mt-4 rounded-2xl bg-amber-50 p-4 text-sm font-bold">Toutes les personnes qui utilisent cette application verront votre publicité.</p>
      <h2 className="mt-6 text-xl font-black uppercase">PAYEZ POUR FAIRE LA PUBLICITÉ DE VOTRE ENTREPRISE, DE VOS PRODUITS OU DE VOTRE BOUTIQUE</h2>
      <p className="mt-2 text-sm text-gray-600">Choisissez votre format, votre durée et votre tarif. Remplissez votre publicité, puis payez. L'envoi et la diffusion sont validés uniquement après confirmation réelle du paiement.</p>

      <div className="mt-6">
        <p className="mb-2 font-black">1. Choisissez ce que vous voulez publier</p>
        <div className="grid grid-cols-3 gap-2">
          {(["text", "image", "video"] as Format[]).map((item) => (
            <button key={item} type="button" onClick={() => { setFormat(item); setSelectedFile(null); setPaymentConfirmed(false); }} className={`rounded-xl border-2 p-3 font-bold ${format === item ? "border-amber-500 bg-amber-50" : "border-gray-200"}`}>
              {item === "text" ? "Texte" : item === "image" ? "Photo" : "Vidéo"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        <p className="mb-2 font-black">2. Choisissez la durée et le prix</p>
        <div className="grid grid-cols-2 gap-2">
          {DURATIONS.map((item) => (
            <button key={item.key} type="button" onClick={() => { setDuration(item); setPaymentConfirmed(false); }} className={`rounded-xl border-2 p-3 text-left ${duration.key === item.key ? "border-amber-500 bg-amber-50" : "border-gray-200"}`}>
              <span className="block font-bold">{item.label}</span>
              <span className="font-black">{item.price.toLocaleString("fr-FR")} XOF</span>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 space-y-3">
        <p className="font-black">3. Préparez votre publicité</p>
        <input className="w-full rounded-xl border p-3" placeholder="Nom de l'entreprise" value={advertiserName} onChange={(e) => setAdvertiserName(e.target.value)} />
        <input className="w-full rounded-xl border p-3" placeholder="Nom de la campagne" value={campaignName} onChange={(e) => setCampaignName(e.target.value)} />
        {format === "text" && <textarea className="min-h-32 w-full rounded-xl border p-3" placeholder="Écrivez votre publicité" value={textContent} onChange={(e) => setTextContent(e.target.value)} />}
        {format !== "text" && <AdMediaPicker type={format} file={selectedFile} onChange={setSelectedFile} />}
        <input className="w-full rounded-xl border p-3" placeholder="Lien vers votre entreprise / boutique (facultatif)" value={destinationUrl} onChange={(e) => setDestinationUrl(e.target.value)} />
        <input className="w-full rounded-xl border p-3" placeholder="Pays ciblé (ex. CI) — facultatif" value={country} onChange={(e) => setCountry(e.target.value)} />
      </div>

      <div className="mt-6 rounded-2xl border p-4">
        <p className="font-black">4. Paiement Mobile Money</p>
        <select className="mt-3 w-full rounded-xl border p-3" value={operator} onChange={(e) => setOperator(e.target.value as "orange_money" | "mtn_money")}>
          <option value="orange_money">Orange Money</option>
          <option value="mtn_money">MTN Mobile Money</option>
        </select>
        <input className="mt-3 w-full rounded-xl border p-3" placeholder="Numéro Mobile Money" value={phone} onChange={(e) => setPhone(e.target.value)} />
        <p className="mt-3 font-black">Prix à payer : {duration.price.toLocaleString("fr-FR")} XOF</p>
        <button type="button" disabled={!canPrepare || !phone.trim() || createPayment.isPending} onClick={handlePay} className="mt-3 w-full rounded-xl bg-black p-4 font-black text-white disabled:opacity-40">{createPayment.isPending ? "Paiement en cours…" : "Payer"}</button>
        <button type="button" disabled={!paymentConfirmed || uploading || createCampaign.isPending || attachPayment.isPending} onClick={handleSubmit} className={`mt-3 w-full rounded-xl p-4 font-black text-white ${paymentConfirmed ? "bg-blue-600" : "bg-black"}`}>{uploading ? "Envoi du média…" : paymentConfirmed ? "Envoyer et commencer la publicité" : "Envoyer et payer"}</button>
        {message && <p className="mt-3 rounded-xl bg-gray-100 p-3 text-sm font-semibold">{message}</p>}
        {!paymentConfirmed && <p className="mt-2 text-center text-xs font-semibold text-gray-500">Le bouton Envoyer reste noir et inactif jusqu'à la confirmation réelle du paiement.</p>}
      </div>

      <div className="mt-6 rounded-2xl bg-gray-50 p-4 text-sm">
        <p className="font-black">Conditions de publicité AfriTok</p>
        <ul className="mt-2 list-disc space-y-1 pl-5"><li>Le tarif dépend du format et de la durée.</li><li>Les campagnes sont contrôlées selon les règles publicitaires AfriTok.</li><li>Une campagne non payée ou non confirmée reste inactive.</li><li>Aucun contenu n'est diffusé avant confirmation réelle du paiement.</li><li>La diffusion commence selon la période choisie et les règles de la plateforme.</li></ul>
      </div>
    </section>
  );
}
