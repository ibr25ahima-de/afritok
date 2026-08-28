import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";
import { trpc } from "@/lib/trpc";

/**
 * Carte publicitaire indépendante du feed vidéo normal.
 * Récupère une campagne active, enregistre l'impression et les clics.
 */
export default function AdFeedCard() {
  const { data: ad, isLoading } = trpc.advertising.getNextAdvertisement.useQuery(
    {},
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const impressionSent = useRef(false);
  const recordImpression = trpc.advertising.recordImpression.useMutation();
  const recordClick = trpc.advertising.recordClick.useMutation();

  useEffect(() => {
    if (!ad || impressionSent.current) return;
    impressionSent.current = true;
    recordImpression.mutate({ campaignId: ad.campaignId });
  }, [ad, recordImpression]);

  if (isLoading || !ad) return null;

  const handleClick = () => {
    recordClick.mutate({ campaignId: ad.campaignId });
    if (ad.destinationUrl) {
      window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <article className="relative h-screen w-full flex-shrink-0 snap-start bg-black text-white">
      <div className="absolute inset-0 flex items-center justify-center p-5">
        <div className="w-full max-w-xl overflow-hidden rounded-3xl border border-amber-400/30 bg-zinc-950 shadow-2xl">
          <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
            <Megaphone size={18} className="text-amber-400" />
            <span className="text-xs font-black uppercase tracking-widest text-amber-300">Publicité</span>
            <span className="ml-auto text-xs text-gray-400">Sponsorisé</span>
          </div>

          {ad.adType === "video" && ad.videoUrl ? (
            <video src={ad.videoUrl} className="max-h-[65vh] w-full object-contain bg-black" controls playsInline muted onClick={handleClick} />
          ) : null}

          {ad.adType === "image" && ad.imageUrl ? (
            <button type="button" onClick={handleClick} className="block w-full bg-black">
              <img src={ad.imageUrl} alt={ad.name} className="max-h-[65vh] w-full object-contain" />
            </button>
          ) : null}

          {ad.adType === "text" ? (
            <button type="button" onClick={handleClick} className="flex min-h-[300px] w-full items-center justify-center p-8 text-center">
              <p className="text-2xl font-black leading-tight text-amber-300 sm:text-3xl">{ad.textContent}</p>
            </button>
          ) : null}

          <div className="p-5">
            <p className="text-xs font-bold uppercase tracking-widest text-gray-500">{ad.advertiserName}</p>
            <h2 className="mt-1 text-xl font-black">{ad.name}</h2>
            {ad.destinationUrl ? (
              <button type="button" onClick={handleClick} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-4 py-3 font-black text-black transition hover:bg-amber-300 active:scale-[0.98]">
                Découvrir la publicité
                <ExternalLink size={18} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
