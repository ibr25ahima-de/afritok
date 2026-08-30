import { useEffect, useRef, useState } from "react";
import { ExternalLink, Megaphone, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

/** Global sponsored ad slot. Premium users with an active subscription do not receive this global ad. */
export default function GlobalAdSlot() {
  const [closed, setClosed] = useState(false);
  const impressionSent = useRef(false);
  const { data: premium } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000, refetchOnWindowFocus: false });
  const { data: ad } = trpc.advertising.getNextAdvertisement.useQuery({}, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: premium?.isPremium !== true,
  });
  const recordImpression = trpc.advertising.recordImpression.useMutation();
  const recordClick = trpc.advertising.recordClick.useMutation();

  useEffect(() => {
    if (!ad || closed || impressionSent.current) return;
    impressionSent.current = true;
    recordImpression.mutate({ campaignId: ad.campaignId });
  }, [ad, closed, recordImpression]);

  if (premium?.isPremium === true || !ad || closed) return null;

  const handleClick = () => {
    recordClick.mutate({ campaignId: ad.campaignId });
    if (ad.destinationUrl) window.open(ad.destinationUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="fixed bottom-20 left-3 right-3 z-[80] mx-auto max-w-lg">
      <div className="overflow-hidden rounded-2xl border border-amber-400/40 bg-black/95 shadow-2xl backdrop-blur-md">
        <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
          <Megaphone size={15} className="text-amber-400" />
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-300">Publicité sponsorisée</span>
          <button type="button" onClick={() => setClosed(true)} className="ml-auto rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white" aria-label="Fermer la publicité"><X size={16} /></button>
        </div>
        <div className="flex gap-3 p-3">
          {ad.adType === "image" && ad.imageUrl ? <img src={ad.imageUrl} alt={ad.name} className="h-20 w-20 shrink-0 rounded-xl object-cover" /> : null}
          {ad.adType === "video" && ad.videoUrl ? <video src={ad.videoUrl} className="h-20 w-20 shrink-0 rounded-xl object-cover" muted playsInline /> : null}
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-gray-500">{ad.advertiserName}</p>
            <h3 className="truncate text-sm font-black text-white">{ad.name}</h3>
            {ad.adType === "text" ? <p className="mt-1 line-clamp-2 text-xs text-gray-300">{ad.textContent}</p> : null}
            {ad.destinationUrl ? <button type="button" onClick={handleClick} className="mt-2 inline-flex items-center gap-1 rounded-lg bg-amber-400 px-3 py-1.5 text-xs font-black text-black hover:bg-amber-300">Découvrir <ExternalLink size={13} /></button> : null}
          </div>
        </div>
      </div>
    </div>
  );
}
