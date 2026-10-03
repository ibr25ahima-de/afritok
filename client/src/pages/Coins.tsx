import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Coins as CoinsIcon, History, ShoppingCart } from "lucide-react";
import { useLocation } from "wouter";
import { Capacitor } from "@capacitor/core";
import { NativePurchases, PURCHASE_TYPE } from "@capgo/native-purchases";
import { trpc } from "@/lib/trpc";

export default function Coins() {
  const [, navigate] = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [storeProducts, setStoreProducts] = useState<Record<string, any>>({});
  const [billingSupported, setBillingSupported] = useState(false);
  const [isBuying, setIsBuying] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const isAndroid = Capacitor.getPlatform() === "android";
  const isNative = Capacitor.isNativePlatform();

  const balanceQuery = trpc.coins.getBalance.useQuery(undefined, { refetchInterval: 10000 });
  const packagesQuery = trpc.coins.getPackages.useQuery();
  const accountTokenQuery = trpc.coins.getGooglePlayAccountToken.useQuery(undefined, { enabled: isAndroid });
  const purchaseGooglePlay = trpc.coins.purchaseGooglePlay.useMutation();

  const balance = balanceQuery.data?.balance ?? 0;
  const packages = packagesQuery.data ?? [];

  useEffect(() => {
    if (!isAndroid || packages.length === 0) return;

    let cancelled = false;
    (async () => {
      try {
        const support = await NativePurchases.isBillingSupported();
        if (cancelled) return;
        setBillingSupported(support.isBillingSupported);
        if (!support.isBillingSupported) return;

        const { products } = await NativePurchases.getProducts({
          productIdentifiers: packages.map((item) => item.id),
          productType: PURCHASE_TYPE.INAPP,
        });
        if (cancelled) return;
        setStoreProducts(Object.fromEntries(products.map((product) => [product.identifier, product])));
      } catch (error) {
        console.error("[Coins] Google Play products unavailable", error);
        if (!cancelled) setBillingSupported(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAndroid, packages]);

  const selected = useMemo(() => packages.find((item) => item.id === selectedPackage) ?? null, [packages, selectedPackage]);

  const buySelectedPackage = async () => {
    if (!selected || !isAndroid) return;
    if (!billingSupported) {
      setMessage("Google Play Billing n'est pas disponible sur cet appareil.");
      return;
    }
    if (!accountTokenQuery.data?.token) {
      setMessage("Le compte Google Play Afritok n'est pas encore prêt. Réessaie dans un instant.");
      return;
    }

    setIsBuying(true);
    setMessage(null);
    try {
      const transaction = await NativePurchases.purchaseProduct({
        productIdentifier: selected.id,
        productType: PURCHASE_TYPE.INAPP,
        quantity: 1,
        appAccountToken: accountTokenQuery.data.token,
        isConsumable: true,
        autoAcknowledgePurchases: false,
      });

      if (!transaction.purchaseToken) throw new Error("Google Play n'a pas fourni de purchase token.");

      const result = await purchaseGooglePlay.mutateAsync({
        productId: selected.id,
        purchaseToken: transaction.purchaseToken,
      });

      await balanceQuery.refetch();
      setSelectedPackage(null);
      setMessage(result.consumePending ? "Coins crédités. La finalisation Google Play sera réessayée." : "Paiement confirmé : tes Coins sont disponibles.");
    } catch (error) {
      console.error("[Coins] Google Play purchase failed", error);
      setMessage(error instanceof Error ? error.message : "Le paiement Google Play n'a pas pu être finalisé.");
    } finally {
      setIsBuying(false);
    }
  };

  return (
    <div className="min-h-[100dvh] bg-black text-white pb-20">
      <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-4 flex items-center gap-4">
        <button onClick={() => navigate("/profile")} className="text-white"><ArrowLeft size={24} /></button>
        <h1 className="text-xl font-bold">Mes Coins</h1>
      </header>

      <section className="px-4 pt-6">
        <div className="bg-gradient-to-br from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-3"><CoinsIcon size={30} className="text-yellow-400" /><span className="text-gray-300">Solde disponible</span></div>
          <p className="text-4xl font-bold text-yellow-400">{Number(balance).toLocaleString("fr-FR")}</p>
          <p className="text-gray-400 text-sm mt-2">Coins</p>
        </div>
      </section>

      <section className="px-4 mt-8">
        <div className="flex items-center gap-2 mb-4"><ShoppingCart size={20} className="text-yellow-400" /><h2 className="text-lg font-bold">Acheter des Coins</h2></div>

        {packagesQuery.isLoading ? (
          <p className="text-gray-400">Chargement des offres...</p>
        ) : packages.length === 0 ? (
          <p className="text-gray-400">Aucun pack disponible.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {packages.map((coinPackage) => {
              const storeProduct = storeProducts[coinPackage.id];
              return (
                <button key={coinPackage.id} onClick={() => setSelectedPackage(coinPackage.id)} className={`p-4 rounded-xl border text-left transition ${selectedPackage === coinPackage.id ? "border-yellow-400 bg-yellow-400/10" : "border-gray-800 bg-gray-900 hover:border-gray-600"}`}>
                  <div className="flex items-center gap-2"><CoinsIcon size={18} className="text-yellow-400" /><span className="font-bold">{Number(coinPackage.coins).toLocaleString("fr-FR")}</span></div>
                  <p className="text-gray-400 text-sm mt-2">
                    {isAndroid && storeProduct ? storeProduct.priceString : `${Number(coinPackage.price).toLocaleString("fr-FR")} ${coinPackage.currency}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </section>

      {selected && (
        <section className="px-4 mt-6">
          {isAndroid ? (
            <>
              <button onClick={buySelectedPackage} disabled={isBuying || !billingSupported || !storeProducts[selected.id]} className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed">
                {isBuying ? "Ouverture de Google Play..." : "Payer avec Google Play"}
              </button>
              <p className="text-gray-500 text-xs text-center mt-3">Google Play affichera le prix et les moyens de paiement disponibles pour ton pays.</p>
            </>
          ) : isNative ? (
            <>
              <button disabled className="w-full bg-gray-700 text-white py-4 rounded-xl font-bold opacity-70">Paiement mobile bientôt disponible</button>
              <p className="text-gray-500 text-xs text-center mt-3">L'intégration Android Google Play est en cours. L'intégration iPhone sera branchée séparément.</p>
            </>
          ) : (
            <>
              <button disabled className="w-full bg-gray-700 text-white py-4 rounded-xl font-bold opacity-70">Paiement mobile uniquement</button>
              <p className="text-gray-500 text-xs text-center mt-3">Sur la version Web, le circuit de paiement sera traité séparément.</p>
            </>
          )}
          {message && <p className="text-yellow-300 text-sm text-center mt-3">{message}</p>}
        </section>
      )}

      <section className="px-4 mt-10">
        <h2 className="text-lg font-bold mb-4">Utiliser mes Coins</h2>
        <div className="space-y-3">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><span className="text-2xl">🎁</span><div><p className="font-semibold">Cadeaux pendant les Lives</p><p className="text-gray-400 text-sm">Utilise tes Coins pour envoyer des cadeaux au propriétaire du Live.</p></div></div></div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex items-center gap-3"><span className="text-2xl">❤️</span><div><p className="font-semibold">Faire plaisir au propriétaire d'une vidéo</p><p className="text-gray-400 text-sm">Utilise tes Coins pour envoyer un cadeau au créateur d'une vidéo.</p></div></div></div>
        </div>
      </section>

      <section className="px-4 mt-10">
        <button onClick={() => navigate("/coins/history")} className="w-full bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-3"><History size={20} className="text-gray-300" /><span className="font-semibold">Historique de mes Coins</span></button>
      </section>
    </div>
  );
}
