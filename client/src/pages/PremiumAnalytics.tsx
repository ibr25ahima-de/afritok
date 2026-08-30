import { ArrowLeft, BarChart3, Heart, MessageCircle, Share2, Star, Eye } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

const n = (value: unknown) => Number(value || 0).toLocaleString("fr-FR");

export default function PremiumAnalytics() {
  const [, navigate] = useLocation();
  const { data, isLoading, error } = trpc.subscription.analytics.useQuery({ days: 30 });
  return <div className="min-h-screen bg-black text-white pb-10">
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-4 flex items-center gap-3"><button onClick={() => navigate("/premium")} aria-label="Retour"><ArrowLeft size={24}/></button><BarChart3 className="text-amber-400"/><h1 className="text-xl font-black">Analytics Premium</h1></header>
    <main className="max-w-lg mx-auto px-4 py-6 space-y-5">
      {isLoading && <div className="rounded-xl bg-gray-900 p-6 text-center text-gray-400">Chargement de vos statistiques…</div>}
      {error && <div className="rounded-xl border border-red-900 bg-red-950/30 p-5"><p className="font-bold">Analytics Premium</p><p className="text-sm text-gray-400 mt-2">{error.message}</p></div>}
      {data && <>
        <section><p className="text-gray-400 text-sm">30 derniers jours</p><div className="grid grid-cols-2 gap-3 mt-3">{[[Eye,"Vues",data.summary.views],[Heart,"Likes",data.summary.likes],[MessageCircle,"Commentaires",data.summary.comments],[Share2,"Partages",data.summary.shares],[Star,"Favoris",data.summary.favorites],[BarChart3,"Vidéos",data.summary.videos]].map(([Icon,label,value]: any)=><div key={label} className="rounded-xl bg-gray-900 border border-gray-800 p-4"><Icon size={20} className="text-amber-400"/><p className="text-gray-400 text-xs mt-3">{label}</p><p className="text-2xl font-black mt-1">{n(value)}</p></div>)}</div></section>
        <section><h2 className="font-black text-lg mb-3">Vos meilleures vidéos</h2><div className="space-y-2">{data.topVideos.length === 0 ? <div className="bg-gray-900 rounded-xl p-5 text-gray-400">Aucune vidéo sur cette période.</div> : data.topVideos.map((video: any, i: number)=><div key={video.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4"><div className="flex justify-between gap-3"><p className="font-bold truncate">{i+1}. {video.title || "Vidéo sans titre"}</p><span className="text-amber-400 text-sm font-bold">{n(video.views)} vues</span></div><div className="flex gap-4 text-xs text-gray-400 mt-3"><span>♥ {n(video.likes)}</span><span>💬 {n(video.comments)}</span><span>↗ {n(video.shares)}</span><span>★ {n(video.favorites)}</span></div></div>)}</div></section>
      </>}
    </main>
  </div>;
}
