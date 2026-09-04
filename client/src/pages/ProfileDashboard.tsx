import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { CoinsButton } from "@/components/CoinsButton";
import { WalletButton } from "@/components/WalletButton";
import { Button } from "@/components/ui/button";
import { LiveStatusBadge } from "@/features/live/LiveStatusBadge";
import { ArrowLeft, Edit3, Flame, Heart, Lock, MoreVertical, Play, Settings, Share2, UserPlus, UserCheck, BarChart3, Trash2, ChevronUp, ChevronDown, X } from "lucide-react";
import { useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";

type Video = { id:number; title:string|null; description:string|null; videoUrl:string; likes:number|null; comments:number|null; shares:number|null };

export default function ProfileDashboard() {
  const { user: currentUser } = useAuth();
  const [, navigate] = useLocation();
  const [, params] = useRoute("/profile/:userId");
  const userId = params?.userId ? Number(params.userId) : currentUser?.id;
  const isOwn = !!currentUser?.id && currentUser.id === userId;
  const [menu, setMenu] = useState(false);
  const [monetization, setMonetization] = useState(false);
  const [tab, setTab] = useState<"videos"|"likes"|"favorites">("videos");
  const [selected, setSelected] = useState<number|null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video|null>(null);
  const [touchStartY, setTouchStartY] = useState<number|null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressTriggered = useRef(false);
  const follow = trpc.follower.toggle.useMutation();
  const profileQuery = trpc.user.getProfile.useQuery({userId:userId || 0},{enabled:!!userId});
  const videosQuery = trpc.video.getByUser.useQuery({userId:userId || 0},{enabled:!!userId});
  const utils = trpc.useUtils();
  const deleteVideo = trpc.video.delete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.video.getByUser.invalidate({ userId: userId || 0 }),
        utils.video.feed.invalidate(),
        utils.feed.getFeed.invalidate(),
      ]);
      setDeleteTarget(null);
      setSelected(null);
    },
  });
  const countsQuery = trpc.follower.getCount.useQuery({userId:userId || 0},{enabled:!!userId});
  const earningsQuery = trpc.earnings.getMyEarnings.useQuery(undefined,{enabled:isOwn,refetchInterval:10000});
  if (!userId) return <div className="min-h-screen bg-black text-white grid place-items-center">Profil non trouvé</div>;
  if (profileQuery.isLoading) return <div className="min-h-screen bg-black text-white grid place-items-center">Chargement du profil...</div>;
  const profile = profileQuery.data;
  const videos = (videosQuery.data || []) as Video[];
  const counts:any = countsQuery.data || {};
  const earnings:any = earningsQuery.data || {};
  const likes = videos.reduce((n,v)=>n+(v.likes||0),0);
  const moveSelected = (direction: 1 | -1) => {
    if (selected === null || videos.length < 2) return;
    setSelected((selected + direction + videos.length) % videos.length);
  };
  const handleDeleteVideo = async (videoId: number) => {
    if (!isOwn || deleteVideo.isPending) return;
    try { await deleteVideo.mutateAsync({ videoId }); }
    catch { alert("La suppression a échoué. Réessaie."); }
  };

  const clearLongPressTimer = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  };

  const handleVideoPointerDown = (video: Video) => {
    if (!isOwn || tab !== "videos") return;
    longPressTriggered.current = false;
    clearLongPressTimer();
    longPressTimer.current = setTimeout(() => {
      longPressTriggered.current = true;
      setDeleteTarget(video);
    }, 600);
  };

  const handleVideoPointerUp = (videoIndex: number) => {
    clearLongPressTimer();
    if (!longPressTriggered.current) setSelected(videoIndex);
    longPressTriggered.current = false;
  };

  const handleVideoPointerCancel = () => {
    clearLongPressTimer();
    longPressTriggered.current = false;
  };

  return <div className="min-h-screen bg-black text-white pb-20">
    <header className="sticky top-0 z-40 bg-black/90 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <button onClick={()=>navigate("/feed")}><ArrowLeft size={24}/></button>
      <h1 className="font-bold">{profile?.name || "Profil"}</h1>
      <button onClick={()=>setMenu(!menu)} className="relative"><MoreVertical/>{menu && <div className="absolute right-0 top-full mt-2 w-56 bg-gray-900 rounded-xl border border-gray-800 overflow-hidden z-50">
        {isOwn && <><button onClick={()=>navigate("/settings")} className="w-full text-left px-4 py-3 hover:bg-gray-800 flex gap-2"><Settings size={17}/> Paramètres</button><button onClick={()=>navigate("/monetization")} className="w-full text-left px-4 py-3 hover:bg-gray-800 flex gap-2"><Flame size={17}/> Monétisation</button><button onClick={()=>navigate("/afritok-studio")} className="w-full text-left px-4 py-3 hover:bg-gray-800">🎬 Afritok Studio</button>{currentUser?.role === "admin" && <button onClick={()=>navigate("/admin")} className="w-full text-left px-4 py-3 hover:bg-gray-800">⚙️ Tableau de bord</button>}</>}
        <button className="w-full text-left px-4 py-3 hover:bg-gray-800">Partager le profil</button>
      </div>}</button>
    </header>

    <section className="px-4 py-6 border-b border-gray-800">
      <div className="flex items-start gap-4">
        <div className="relative shrink-0">{profile?.avatarUrl ? <img src={profile.avatarUrl} className="w-20 h-20 rounded-full object-cover border-2 border-red-500"/> : <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 grid place-items-center text-2xl font-bold">{profile?.name?.[0]?.toUpperCase()||"U"}</div>}<div className="absolute -bottom-2 left-1/2 -translate-x-1/2"><LiveStatusBadge userId={userId}/></div></div>
        <div className="flex-1"><h2 className="text-2xl font-bold">{profile?.name||"Utilisateur"}</h2><p className="text-gray-400 text-sm">@{profile?.email?.split("@")[0]||"username"}</p>{profile?.bio&&<p className="text-gray-300 text-sm mt-2">{profile.bio}</p>}</div>
        {isOwn ? <button onClick={()=>navigate("/edit-profile")} className="bg-red-500 px-4 py-2 rounded-full"><Edit3 size={18}/></button> : <button onClick={()=>follow.mutate({followingId:userId})} className="bg-red-500 px-4 py-2 rounded-full"><UserPlus size={18}/></button>}
      </div>
      {isOwn && <div className="flex items-center gap-2 my-4 text-red-500 text-sm"><Flame size={16}/> Afritok Studio</div>}
      <div className="grid grid-cols-3 text-center mt-5 border-t border-gray-800 pt-4"><div><b className="text-xl">{counts.following||0}</b><p className="text-xs text-gray-400">Suivis</p></div><div><b className="text-xl">{counts.followers||0}</b><p className="text-xs text-gray-400">Abonnés</p></div><div><b className="text-xl">{likes}</b><p className="text-xs text-gray-400">Likes</p></div></div>
      {isOwn && <><div className="flex gap-2 mt-4"><CoinsButton/><WalletButton/></div><div className="grid grid-cols-3 gap-2 mt-4"><div className="bg-gray-900 rounded-xl p-3"><p className="text-xs text-gray-400">Total gagné</p><b className="text-green-400">${Number(earnings.total||0).toFixed(2)}</b></div><div className="bg-gray-900 rounded-xl p-3"><p className="text-xs text-gray-400">Disponible</p><b>${Number(earnings.available||0).toFixed(2)}</b></div><div className="bg-gray-900 rounded-xl p-3"><p className="text-xs text-gray-400">En attente</p><b className="text-yellow-400">${Number(earnings.pending||0).toFixed(2)}</b></div></div><Button onClick={()=>setMonetization(true)} className="w-full mt-4 bg-green-500">💰 Portefeuille / Monétisation</Button><Button onClick={()=>navigate("/instant-withdraw")} className="w-full mt-2">💸 Retirer mon argent</Button></>}
      <div className="flex justify-around mt-4 pt-4 border-t border-gray-800 text-gray-400"><span><MoreVertical size={18}/><small>Plus</small></span><span><Lock size={18}/><small>Privé</small></span><button onClick={()=>navigator.share?.({title:profile?.name||"Profil",url:location.href})}><Share2 size={18}/><small>Partager</small></button><span><Heart size={18}/><small>Favoris</small></span></div>
    </section>

    <div className="flex border-b border-gray-800"><button onClick={()=>setTab("videos")} className={`flex-1 py-3 ${tab==="videos"?"border-b-2 border-red-500":"text-gray-400"}`}>Vidéos</button><button onClick={()=>setTab("likes")} className={`flex-1 py-3 ${tab==="likes"?"border-b-2 border-red-500":"text-gray-400"}`}><Heart size={16} className="inline"/> Likes</button><button onClick={()=>setTab("favorites")} className={`flex-1 py-3 ${tab==="favorites"?"border-b-2 border-red-500":"text-gray-400"}`}>Favoris</button></div>
    <div className="grid grid-cols-3 gap-1 p-1">{videos.map((v,i)=><button key={v.id} onPointerDown={()=>handleVideoPointerDown(v)} onPointerUp={()=>handleVideoPointerUp(i)} onPointerCancel={handleVideoPointerCancel} onPointerLeave={handleVideoPointerCancel} onContextMenu={(event)=>event.preventDefault()} className="aspect-square bg-gray-900 overflow-hidden relative select-none touch-manipulation"><video src={v.videoUrl} muted playsInline className="w-full h-full object-cover pointer-events-none"/><span className="absolute bottom-1 left-1 text-xs flex items-center gap-1"><Heart size={11}/>{v.likes||0}</span></button>)}</div>

    {deleteTarget && isOwn && <div className="fixed inset-0 z-[120] bg-black/80 flex items-center justify-center px-5" onClick={()=>!deleteVideo.isPending && setDeleteTarget(null)}><div className="w-full max-w-sm bg-gray-900 rounded-2xl border border-gray-700 p-5 shadow-2xl" onClick={(event)=>event.stopPropagation()}><div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold">Options de la vidéo</h2><button onClick={()=>setDeleteTarget(null)} disabled={deleteVideo.isPending} aria-label="Fermer"><X size={20}/></button></div><p className="text-gray-300 text-sm mb-5">Que veux-tu faire avec cette vidéo ?</p><Button onClick={()=>handleDeleteVideo(deleteTarget.id)} disabled={deleteVideo.isPending} className="w-full bg-red-600 hover:bg-red-500">{deleteVideo.isPending ? "Suppression…" : "Supprimer"}</Button><Button onClick={()=>setDeleteTarget(null)} disabled={deleteVideo.isPending} variant="outline" className="w-full mt-3">Annuler</Button></div></div>}

    {monetization && <div className="fixed inset-0 z-[100] bg-black/80 flex items-end"><div className="w-full bg-gray-900 rounded-t-3xl p-6"><div className="flex justify-between"><h2 className="text-2xl font-bold">🔥 Monétisation</h2><button onClick={()=>setMonetization(false)}>✕</button></div><p className="text-gray-300 mt-5">Total gagné : <b className="text-green-400">${Number(earnings.total||0).toFixed(2)}</b></p><p className="text-gray-400 mt-4">Gagne de l'argent avec tes vidéos, tes Lives et les cadeaux reçus.</p><Button onClick={()=>navigate("/monetization")} className="w-full mt-6">Ouvrir le portail de monétisation</Button></div></div>}
    {selected!==null && videos[selected] && <div className="fixed inset-0 z-[100] bg-black flex flex-col" onWheel={(event)=>{if (Math.abs(event.deltaY)>20) moveSelected(event.deltaY>0 ? 1 : -1);}} onTouchStart={(event)=>setTouchStartY(event.touches[0].clientY)} onTouchEnd={(event)=>{if (touchStartY !== null) { const delta = touchStartY - event.changedTouches[0].clientY; if (Math.abs(delta)>40) moveSelected(delta>0 ? 1 : -1); } setTouchStartY(null);}}><button onClick={()=>setSelected(null)} className="absolute top-4 left-4 z-10 bg-black/60 rounded-full p-3"><ArrowLeft/></button>{videos.length>1 && <><button onClick={()=>moveSelected(-1)} aria-label="Vidéo précédente" className="absolute top-1/2 left-4 z-10 -translate-y-1/2 rounded-full bg-black/60 p-3"><ChevronUp/></button><button onClick={()=>moveSelected(1)} aria-label="Vidéo suivante" className="absolute top-1/2 right-4 z-10 -translate-y-1/2 rounded-full bg-black/60 p-3"><ChevronDown/></button></>}<video key={videos[selected].id} src={videos[selected].videoUrl} autoPlay controls className="w-full h-full object-contain"/></div>}
  </div>;
}
