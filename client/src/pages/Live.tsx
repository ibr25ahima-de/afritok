import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Camera, CameraOff, Gift, Heart, Loader2, Mic, MicOff, Radio, Send, Users, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

const ICE_SERVERS: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

type ChatMessage = { id: string; userId: number; username: string; message: string };
type FloatingGift = { id: string; icon: string; name: string; username: string };

export default function Live() {
  const [, navigate] = useLocation();
  const [, params] = useRoute("/live/:sessionId");
  const sessionId = params?.sessionId || "";
  const [showCreate, setShowCreate] = useState(!sessionId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState("");
  const [isHost, setIsHost] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [viewerCount, setViewerCount] = useState(0);
  const [chat, setChat] = useState<ChatMessage[]>([]);
  const [chatText, setChatText] = useState("");
  const [showGifts, setShowGifts] = useState(false);
  const [floatingGifts, setFloatingGifts] = useState<FloatingGift[]>([]);
  const [sendingGift, setSendingGift] = useState(false);
  const [balance, setBalance] = useState(0);
  const [remoteReady, setRemoteReady] = useState(false);

  const { data: me } = trpc.auth.me.useQuery();
  const { data: session, refetch: refetchSession } = trpc.live.getSession.useQuery({ sessionId }, { enabled: !!sessionId, refetchInterval: 5000 });
  const { data: publicLives } = trpc.live.getPublicSessions.useQuery(undefined, { enabled: !sessionId, refetchInterval: 5000 });
  const { data: gifts } = trpc.coins.getActiveGifts.useQuery();
  const balanceQuery = trpc.coins.getBalance.useQuery(undefined, { enabled: !!me });
  const createSession = trpc.live.createSession.useMutation();
  const startSession = trpc.live.startSession.useMutation();
  const joinSession = trpc.live.joinSession.useMutation();
  const leaveSession = trpc.live.leaveSession.useMutation();
  const endSession = trpc.live.endSession.useMutation();
  const sendGift = trpc.coins.sendGift.useMutation();

  const socketRef = useRef<Socket | null>(null);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const joinedRef = useRef(false);

  useEffect(() => setBalance(Number(balanceQuery.data?.balance || 0)), [balanceQuery.data]);

  const cleanupPeer = (id: string) => {
    const pc = peersRef.current.get(id);
    if (pc) pc.close();
    peersRef.current.delete(id);
  };

  const createOfferForViewer = async (targetSocketId: string) => {
    if (!streamRef.current || !socketRef.current) return;
    cleanupPeer(targetSocketId);
    const pc = new RTCPeerConnection(ICE_SERVERS);
    peersRef.current.set(targetSocketId, pc);
    streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!));
    pc.onicecandidate = (event) => { if (event.candidate) socketRef.current?.emit("live:signal", { to: targetSocketId, signal: { type: "ice", candidate: event.candidate } }); };
    pc.onconnectionstatechange = () => { if (["failed", "closed", "disconnected"].includes(pc.connectionState)) cleanupPeer(targetSocketId); };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socketRef.current.emit("live:signal", { to: targetSocketId, signal: { type: "offer", sdp: offer.sdp } });
  };

  useEffect(() => {
    if (!sessionId || !me || !session) return;
    const host = session.hostId === me.id;
    setIsHost(host);
    setViewerCount(Number(session.viewerCount || 0));
    if (joinedRef.current) return;

    let cancelled = false;
    const setup = async () => {
      try {
        if (!host) await joinSession.mutateAsync({ sessionId, role: "viewer" });
        if (cancelled) return;
        const socket = io(window.location.origin, { transports: ["websocket", "polling"] });
        socketRef.current = socket;
        socket.on("connect", () => socket.emit("live:join", { sessionId, userId: me.id, username: me.name || "Utilisateur", role: host ? "host" : "viewer" }));
        socket.on("live:viewer-count", ({ delta }) => setViewerCount((v) => Math.max(0, v + Number(delta || 0))));
        socket.on("live:viewer-joined", ({ socketId }) => { if (host) void createOfferForViewer(socketId); });
        socket.on("live:user-left", ({ socketId }) => cleanupPeer(socketId));
        socket.on("live:chat", (message: ChatMessage) => setChat((items) => [...items.slice(-49), message]));
        socket.on("live:gift", (gift: any) => {
          const item = { id: `${Date.now()}_${Math.random()}`, icon: gift.icon || "🎁", name: gift.name || "Cadeau", username: gift.senderUsername || "Utilisateur" };
          setFloatingGifts((items) => [...items.slice(-2), item]);
          window.setTimeout(() => setFloatingGifts((items) => items.filter((x) => x.id !== item.id)), 4200);
        });
        socket.on("live:signal", async ({ from, signal }) => {
          if (signal.type === "offer" && !host) {
            cleanupPeer(from);
            const pc = new RTCPeerConnection(ICE_SERVERS);
            peersRef.current.set(from, pc);
            pc.ontrack = (event) => { if (remoteVideoRef.current && event.streams[0]) { remoteVideoRef.current.srcObject = event.streams[0]; setRemoteReady(true); } };
            pc.onicecandidate = (event) => { if (event.candidate) socket.emit("live:signal", { to: from, signal: { type: "ice", candidate: event.candidate } }); };
            await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp });
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("live:signal", { to: from, signal: { type: "answer", sdp: answer.sdp } });
          } else if (signal.type === "answer" && host) {
            const pc = peersRef.current.get(from);
            if (pc) await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
          } else if (signal.type === "ice") {
            const pc = peersRef.current.get(from);
            if (pc && signal.candidate) { try { await pc.addIceCandidate(signal.candidate); } catch {} }
          }
        });
        joinedRef.current = true;
        if (host) {
          const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true });
          if (cancelled) { media.getTracks().forEach((t) => t.stop()); return; }
          streamRef.current = media;
          if (localVideoRef.current) localVideoRef.current.srcObject = media;
          setIsMuted(false);
          setIsVideoOff(false);
        }
      } catch (e: any) {
        setError(e?.message || "Impossible d'ouvrir le Live. Vérifie les permissions caméra et microphone.");
      }
    };
    void setup();
    return () => { cancelled = true; };
  }, [sessionId, me?.id, session?.sessionId]);

  useEffect(() => () => {
    socketRef.current?.disconnect();
    peersRef.current.forEach((pc) => pc.close());
    peersRef.current.clear();
    streamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const startNewLive = async () => {
    if (!title.trim()) { setError("Donne un titre à ton Live."); return; }
    setIsStarting(true); setError("");
    try {
      const created = await createSession.mutateAsync({ title: title.trim(), description: description.trim(), type: "video", isPublic: true, maxParticipants: 100 });
      await startSession.mutateAsync({ sessionId: created.sessionId });
      navigate(`/live/${created.sessionId}`);
      setShowCreate(false);
    } catch (e: any) { setError(e?.message || "Impossible de démarrer le Live."); }
    finally { setIsStarting(false); }
  };

  const sendChat = () => {
    if (!chatText.trim() || !socketRef.current) return;
    socketRef.current.emit("live:chat", { sessionId, message: chatText });
    setChatText("");
  };

  const toggleMute = () => {
    const track = streamRef.current?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const muted = !track.enabled;
    setIsMuted(muted);
    socketRef.current?.emit("live:status", { sessionId, isMuted: muted, isVideoOff });
  };

  const toggleVideo = () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    const off = !track.enabled;
    setIsVideoOff(off);
    socketRef.current?.emit("live:status", { sessionId, isMuted, isVideoOff: off });
  };

  const chooseGift = async (gift: any) => {
    if (!session?.hostId || !me || sendingGift) return;
    setSendingGift(true); setError("");
    try {
      const result = await sendGift.mutateAsync({ recipientId: Number(session.hostId), giftId: String(gift.id), quantity: 1, context: "live", contextId: sessionId, idempotencyKey: crypto.randomUUID() });
      setBalance(Number(result.balance));
      setShowGifts(false);
      socketRef.current?.emit("live:gift", { sessionId, gift: { icon: result.gift.icon, name: result.gift.name, quantity: result.gift.quantity } });
    } catch (e: any) { setError(e?.message || "Solde de Coins insuffisant ou cadeau indisponible."); }
    finally { setSendingGift(false); }
  };

  const leave = async () => {
    try {
      if (isHost) await endSession.mutateAsync({ sessionId });
      else await leaveSession.mutateAsync({ sessionId });
    } catch {}
    socketRef.current?.disconnect();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    navigate("/live");
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-black text-white p-4 pb-24">
        <header className="flex items-center gap-3 py-3"><button onClick={() => navigate("/feed")}><ArrowLeft /></button><h1 className="text-2xl font-bold">Live</h1></header>
        <div className="max-w-xl mx-auto pt-6 space-y-5">
          <button onClick={() => setShowCreate(true)} className="w-full rounded-2xl bg-red-500 py-5 font-bold text-lg flex items-center justify-center gap-3"><Radio /> Passer en Live</button>
          {publicLives?.length ? <div><h2 className="font-bold mb-3">Lives en cours</h2><div className="space-y-3">{publicLives.map((live: any) => <button key={live.sessionId} onClick={() => navigate(`/live/${live.sessionId}`)} className="w-full text-left rounded-2xl bg-gray-900 border border-gray-800 p-4"><div className="flex items-center justify-between"><span className="font-semibold">{live.title}</span><span className="text-red-400 text-sm">🔴 LIVE</span></div><p className="text-gray-400 text-sm mt-1">@{live.hostUsername} · {live.viewerCount} spectateur(s)</p></button>)}</div></div> : <p className="text-gray-500 text-center">Aucun Live en cours. Sois le premier !</p>}
        </div>
        {showCreate && <div className="fixed inset-0 z-50 bg-black/80 flex items-end sm:items-center justify-center p-4"><div className="w-full max-w-md bg-gray-950 border border-gray-800 rounded-3xl p-5"><div className="flex justify-between items-center mb-5"><h2 className="text-xl font-bold">Démarrer un Live</h2><button onClick={() => setShowCreate(false)}><X /></button></div><input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du Live" className="w-full bg-gray-900 rounded-xl px-4 py-3 mb-3 outline-none" maxLength={200} /><textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (facultatif)" className="w-full h-24 bg-gray-900 rounded-xl px-4 py-3 mb-4 outline-none resize-none" maxLength={500} /><button disabled={isStarting} onClick={startNewLive} className="w-full rounded-xl bg-red-500 py-3 font-bold disabled:opacity-50">{isStarting ? "Démarrage..." : "Démarrer maintenant"}</button></div></div>}
        {error && <div className="fixed bottom-4 left-4 right-4 z-[60] bg-red-900/90 border border-red-700 rounded-xl p-3 text-sm">{error}</div>}
      </div>
    );
  }

  return (
    <div className="h-[100dvh] bg-black text-white overflow-hidden relative">
      <div className="absolute inset-0 bg-gray-950">
        {isHost ? <video ref={localVideoRef} autoPlay muted playsInline className={`w-full h-full object-cover ${isVideoOff ? "hidden" : ""}`} /> : <video ref={remoteVideoRef} autoPlay playsInline className={`w-full h-full object-cover ${remoteReady ? "" : "hidden"}`} />}
        {((isHost && isVideoOff) || (!isHost && !remoteReady)) && <div className="w-full h-full flex items-center justify-center text-gray-500"><div className="text-center"><CameraOff size={44} className="mx-auto mb-2" /><p>{isHost ? "Caméra désactivée" : "Connexion au Live..."}</p></div></div>}
      </div>

      <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-black/60 via-transparent to-black/85" />
      <header className="absolute top-0 left-0 right-0 z-20 p-4 flex items-center justify-between pointer-events-auto"><div className="flex items-center gap-3"><button onClick={leave} className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center"><ArrowLeft /></button><div><p className="font-bold truncate max-w-[190px]">{session?.title || "Live"}</p><p className="text-xs text-gray-300">@{session?.hostUsername || "..."}</p></div></div><div className="px-3 py-1.5 rounded-full bg-red-500/90 text-sm font-bold flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-white animate-pulse" /> LIVE · <Users size={15} /> {viewerCount}</div></header>

      <div className="absolute right-3 bottom-28 z-20 flex flex-col gap-3 pointer-events-auto">
        {isHost && <><button onClick={toggleVideo} className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">{isVideoOff ? <CameraOff /> : <Camera />}</button><button onClick={toggleMute} className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">{isMuted ? <MicOff /> : <Mic />}</button></>}
        <button onClick={() => setShowGifts(true)} className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg shadow-pink-500/30 animate-pulse"><Gift /></button>
      </div>

      <div className="absolute left-3 right-16 bottom-4 z-20 pointer-events-auto"><div className="max-h-48 overflow-y-auto mb-2 space-y-1.5 pr-2">{chat.map((item) => <div key={item.id} className="text-sm"><span className="font-bold text-yellow-300">{item.username}</span> <span className="text-white/90">{item.message}</span></div>)}</div><div className="flex gap-2"><input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Dire quelque chose..." className="flex-1 min-w-0 bg-black/65 border border-white/10 rounded-full px-4 py-3 outline-none" /><button onClick={sendChat} className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center"><Send size={19} /></button></div></div>

      <div className="absolute left-4 top-24 z-30 pointer-events-none space-y-2">{floatingGifts.map((gift) => <div key={gift.id} className="flex items-center gap-2 bg-black/65 border border-pink-400/40 rounded-full px-3 py-2 animate-bounce"><span className="text-3xl">{gift.icon}</span><div><p className="font-bold text-pink-200">{gift.name}</p><p className="text-xs text-gray-300">{gift.username} envoie un cadeau</p></div></div>)}</div>

      {error && <div className="absolute top-20 left-4 right-4 z-40 bg-red-900/90 border border-red-700 rounded-xl p-3 text-sm pointer-events-auto">{error}</div>}

      {showGifts && <div className="absolute inset-0 z-50 bg-black/65 flex items-end pointer-events-auto"><div className="w-full bg-gray-950 rounded-t-3xl p-5 pb-8 max-h-[65vh] overflow-y-auto"><div className="flex items-center justify-between mb-4"><div><h2 className="font-bold text-lg">🎁 Envoyer un cadeau</h2><p className="text-xs text-gray-400">Solde : 🪙 {balance.toLocaleString("fr-FR")} Coins</p></div><button onClick={() => setShowGifts(false)}><X /></button></div>{gifts?.length ? <div className="grid grid-cols-4 gap-3">{gifts.map((gift: any) => <button key={gift.id} disabled={sendingGift || balance < Number(gift.coins)} onClick={() => chooseGift(gift)} className="rounded-2xl bg-gray-900 border border-gray-800 p-3 disabled:opacity-40 active:scale-95 transition"><div className="text-4xl">{gift.icon}</div><p className="text-xs font-semibold mt-1 truncate">{gift.name}</p><p className="text-[11px] text-yellow-400">🪙 {Number(gift.coins).toLocaleString("fr-FR")}</p></button>)}</div> : <p className="text-gray-500 text-center py-8">Aucun cadeau disponible.</p>}<div className="mt-4 flex items-center gap-2 text-xs text-gray-500"><Heart size={14} /> Les cadeaux sont animés en direct pour tous les spectateurs.</div></div></div>}
    </div>
  );
}
