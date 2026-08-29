import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

const operators = [
  { id: "orange", label: "Orange Money" },
  { id: "mtn", label: "MTN Mobile Money" },
  { id: "moov", label: "Moov Money" },
  { id: "wave", label: "Wave" },
] as const;

type Operator = (typeof operators)[number]["id"];

export default function PremiumPaymentModal({ planId, amount, onClose }: { planId: string; amount: number; onClose: () => void }) {
  const [operator, setOperator] = useState<Operator>("orange");
  const [phone, setPhone] = useState("");
  const [referenceId, setReferenceId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const createPayment = trpc.subscription.createPayment.useMutation({
    onSuccess: (data) => { setReferenceId(data.referenceId); setMessage(data.providerMessage || data.message); },
    onError: (error) => setMessage(error.message),
  });
  const status = trpc.subscription.paymentStatus.useQuery({ referenceId: referenceId || "" }, { enabled: !!referenceId, refetchInterval: referenceId ? 3000 : false });
  useEffect(() => {
    if (status.data?.status === "success") setMessage("🎉 Paiement confirmé. Votre abonnement Premium va être activé.");
    if (status.data?.status === "failed") setMessage("❌ Paiement échoué. Votre abonnement n'a pas été activé.");
  }, [status.data?.status]);
  const canPay = phone.trim().length >= 8 && !createPayment.isPending && !referenceId;
  return (
    <div className="fixed inset-0 z-[200] bg-black/75 flex items-end sm:items-center justify-center p-3">
      <div className="w-full max-w-md rounded-2xl bg-gray-950 border border-gray-800 p-5 space-y-5 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center"><div><h2 className="text-xl font-black">Payer AfriTok Premium</h2><p className="text-amber-400 font-bold mt-1">{amount.toLocaleString("fr-FR")} XOF</p></div><button type="button" onClick={onClose}><X /></button></div>
        <div><label className="text-sm text-gray-300">Opérateur Mobile Money</label><div className="grid grid-cols-2 gap-2 mt-2">{operators.map((item) => <button key={item.id} type="button" disabled={!!referenceId} onClick={() => setOperator(item.id)} className={`rounded-xl border p-3 text-sm font-bold ${operator === item.id ? "border-amber-400 bg-amber-400/10" : "border-gray-800 bg-gray-900"}`}>{item.label}</button>)}</div></div>
        <div><label htmlFor="premium-phone" className="text-sm text-gray-300">Numéro Mobile Money</label><input id="premium-phone" value={phone} disabled={!!referenceId} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="Ex. 05 64 19 41 33" className="mt-2 w-full rounded-xl bg-gray-900 border border-gray-700 px-4 py-3 text-white outline-none" /></div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-4"><p className="text-gray-400 text-sm">Montant à payer</p><p className="text-2xl font-black text-amber-400">{amount.toLocaleString("fr-FR")} XOF</p><p className="text-xs text-gray-500 mt-1">Premium sera activé uniquement après confirmation réelle.</p></div>
        {message && <div className="rounded-xl border border-gray-800 bg-gray-900 p-3 text-sm flex gap-2"><AlertCircle size={18} className="text-amber-400 shrink-0" /><span>{message}</span></div>}
        {status.data?.status === "success" && <div className="text-green-400 flex items-center gap-2 font-bold"><CheckCircle2 size={20} /> Paiement confirmé</div>}
        <button type="button" disabled={!canPay} onClick={() => createPayment.mutate({ planId, operator, phone })} className={`w-full rounded-xl py-4 font-black ${canPay ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-500 cursor-not-allowed"}`}>{createPayment.isPending ? <Loader2 className="mx-auto animate-spin" /> : `Payer ${amount.toLocaleString("fr-FR")} XOF`}</button>
      </div>
    </div>
  );
}
