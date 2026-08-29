import { useState } from "react";
import { ArrowLeft, BadgeCheck, BarChart3, Crown, Sparkles, Video } from "lucide-react";
import { useLocation } from "wouter";

const plans = [
  { id: "week", label: "1 semaine", price: 1000 },
  { id: "month", label: "1 mois", price: 3000, popular: true },
  { id: "quarter", label: "3 mois", price: 7500 },
  { id: "year", label: "1 an", price: 25000 },
];

const benefits = [
  { icon: "🚫", title: "Moins de publicités", text: "Profitez d'une expérience avec moins de publicités." },
  { icon: "🎥", title: "Options vidéo améliorées", text: "Accédez aux fonctionnalités vidéo Premium disponibles sur AfriTok." },
  { icon: "📊", title: "Statistiques avancées", text: "Comprenez mieux les performances de vos vidéos." },
  { icon: "🎨", title: "Personnalisation", text: "Davantage d'options pour personnaliser votre profil." },
  { icon: "⚡", title: "Accès prioritaire", text: "Découvrez certaines nouvelles fonctionnalités Premium en priorité." },
  { icon: "🏆", title: "Badge Premium", text: "Un badge Premium apparaît sur votre profil." },
];

export default function AfritokPremium() {
  const [, navigate] = useLocation();
  const [selectedPlan, setSelectedPlan] = useState("month");
  const selected = plans.find((plan) => plan.id === selectedPlan) ?? plans[1];

  return (
    <div className="min-h-screen bg-black text-white pb-10">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-4 flex items-center gap-3">
        <button type="button" onClick={() => navigate("/profile")} aria-label="Retour au profil">
          <ArrowLeft size={24} />
        </button>
        <div className="flex items-center gap-2">
          <Crown size={22} className="text-amber-400" />
          <h1 className="text-xl font-bold">AfriTok Premium</h1>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-amber-500/20 via-black to-orange-500/10 p-6 text-center">
          <Crown size={46} className="mx-auto text-amber-400 mb-3" />
          <h2 className="text-2xl font-black">Pourquoi passer à AfriTok Premium ?</h2>
          <p className="text-gray-300 mt-3 leading-relaxed">
            Avec Premium, vous profitez de fonctionnalités supplémentaires réservées aux abonnés Premium.
          </p>
          <p className="text-amber-200 text-sm font-semibold mt-3">Votre abonnement ne garantit ni vues, ni likes, ni abonnés.</p>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Ce qui vous différencie d'un utilisateur gratuit</h2>
          <div className="space-y-3">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex gap-3">
                <span className="text-2xl">{benefit.icon}</span>
                <div>
                  <p className="font-bold">{benefit.title}</p>
                  <p className="text-gray-400 text-sm mt-1">{benefit.text}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="text-lg font-bold mb-3">Choisissez votre formule</h2>
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative rounded-xl border p-4 text-left transition ${selectedPlan === plan.id ? "border-amber-400 bg-amber-400/10" : "border-gray-800 bg-gray-900"}`}
              >
                {plan.popular && <span className="absolute -top-2 right-2 bg-amber-400 text-black text-[10px] font-black px-2 py-1 rounded-full">POPULAIRE</span>}
                <p className="font-bold">{plan.label}</p>
                <p className="text-amber-400 text-xl font-black mt-1">{plan.price.toLocaleString("fr-FR")} XOF</p>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-gray-800 bg-gray-900/70 p-4 space-y-3">
          <div className="flex items-center gap-2"><BadgeCheck size={19} className="text-amber-400" /><span className="font-bold">Paiement sécurisé</span></div>
          <p className="text-gray-400 text-sm">Le paiement réel sera confirmé par le système de paiement AfriTok avant toute activation.</p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs text-gray-400">
            <div><BarChart3 className="mx-auto mb-1" size={18} />Statistiques</div>
            <div><Video className="mx-auto mb-1" size={18} />Fonctions vidéo</div>
            <div><Sparkles className="mx-auto mb-1" size={18} />Premium</div>
          </div>
        </section>

        <button
          type="button"
          disabled
          className="w-full rounded-xl bg-gray-700 text-gray-400 py-4 font-black cursor-not-allowed"
          title="Le paiement réel sera branché avec le système de paiement central"
        >
          Payer {selected.price.toLocaleString("fr-FR")} XOF
        </button>
        <p className="text-center text-xs text-gray-500">Le bouton de paiement restera indisponible tant que la route de paiement réelle n'est pas branchée et confirmée.</p>
      </main>
    </div>
  );
}
