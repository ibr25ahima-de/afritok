import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { ArrowLeft, Camera, CameraOff, Gift, Heart, Mic, MicOff, Send, Users, X } from "lucide-react";
import { useLocation, useRoute } from "wouter";
import { trpc } from "@/lib/trpc";
import { LiveStagePanel } from "./LiveStagePanel";
import { LiveStageLayout } from "./LiveStageLayout";
import { isLiveLayoutId, type LiveLayoutId } from "./live-layouts";

type Participant = { userId: number; username: string; role: string; isMuted: boolean; isVideoOff: boolean };
type Request = { requestId: string; userId: number; username: string; createdAt?: string };
type ChatMessage = { id: string; userId: number; username: string; message: string };
const ICE_SERVERS: RTCConfiguration = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

export function LiveRoom() {
  const [, navigate] = useLocation(); const [, params] = useRoute("/live/:sessionId"); const sessionId = params?.sessionId || "";
  const { data: me } = trpc.auth.me.useQuery();
  const { data: session } = trpc.live.getSession.useQuery({ sessionId }, { enabled: !!sessionId, refetchInterval: 5000 });
  const { data: gifts } = trpc.coins.getActiveGifts.useQuery(); const balanceQuery = trpc.coins.getBalance.useQuery(undefined, { enabled: !!me });
  const requestQuery = trpc.live.getMyStageRequest.useQuery({ sessionId }, { enabled: !!sessionId, refetchInterval: 3000 });
  const pendingQuery = trpc.live.getPendingStageRequests.useQuery({ sessionId }, { enabled: !!sessionId && !!me && !!session && session.hostId === me.id, refetchInterval: 2000 });
  const joinSession = trpc.live.joinSession.useMutation(); const leaveSession = trpc.live.leaveSession.useMutation(); const endSession = trpc.live.endSession.useMutation();
  const requestStage = trpc.live.requestToJoinStage.useMutation(); const acceptRequest = trpc.live.approveStageRequest.useMutation(); const rejectRequest = trpc.live.rejectStageRequest.useMutation();
  const muteParticipant = trpc.live.muteParticipant.useMutation(); const removeParticipant = trpc.live.removeFromStage.useMutation(); const sendGift = trpc.coins.sendGift.useMutation();
  const socketRef = useRef<Socket | null>(null); const localVideoRef = useRef<HTMLVideoElement>(null); const remoteVideoRef = useRef<HTMLVideoElement>(null); const streamRef = useRef<MediaStream | null>(null); const peersRef = useRef<Map<string, RTCPeerConnection>>(new Map());
  const [participants, setParticipants] = useState<Participant[]>([]); const [requests, setRequests] = useState<Request[]>([]); const [remoteReady, setRemoteReady] = useState(false); const [isMuted, setIsMuted] = useState(false); const [isVideoOff, setIsVideoOff] = useState(false); const [viewerCount, setViewerCount] = useState(0); const [chat, setChat] = useState<ChatMessage[]>([]); const [chatText, setChatText] = useState(""); const [showGifts, setShowGifts] = useState(false); const [balance, setBalance] = useState(0);
  const [layout, setLayout] = useState<LiveLayoutId>("spotlight");
  const isHost = !!me && !!session && me.id === session.hostId;
  useEffect(() => { const saved = sessionId ? sessionStorage.getItem(`afritok:live-layout:${sessionId}`) : null; if (saved && isLiveLayoutId(saved)) setLayout(saved); }, [sessionId]);
  useEffect(() => setBalance(Number(balanceQuery.data?.balance || 0)), [balanceQuery.data]); useEffect(() => { if (pendingQuery.data) setRequests(pendingQuery.data as Request[]); }, [pendingQuery.data]);

  const createOffer = async (socketId: string) => { if (!streamRef.current || !socketRef.current) return; peersRef.current.get(socketId)?.close(); const pc = new RTCPeerConnection(ICE_SERVERS); peersRef.current.set(socketId, pc); streamRef.current.getTracks().forEach((track) => pc.addTrack(track, streamRef.current!)); pc.onicecandidate = (e) => { if (e.candidate) socketRef.current?.emit("live:signal", { to: socketId, signal: { type: "ice", candidate: e.candidate } }); }; const offer = await pc.createOffer(); await pc.setLocalDescription(offer); socketRef.current.emit("live:signal", { to: socketId, signal: { type: "offer", sdp: offer.sdp } }); };
  const startStageMedia = async () => { if (streamRef.current || !navigator.mediaDevices?.getUserMedia) return; const media = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: true }); streamRef.current = media; if (localVideoRef.current) localVideoRef.current.srcObject = media; setIsMuted(false); setIsVideoOff(false); if (!isHost) socketRef.current?.emit("live:stage-media-ready", { sessionId }); };

  useEffect(() => {
    if (!sessionId || !me || !session) return; let cancelled = false;
    const setup = async () => { try {
      if (!isHost) await joinSession.mutateAsync({ sessionId, role: "viewer" });
      const socket = io(window.location.origin, { transports: ["websocket", "polling"] }); socketRef.current = socket;
      socket.on("connect", () => socket.emit("live:join", { sessionId, userId: me.id, username: me.name || "Utilisateur", role: isHost ? "host" : "viewer" }));
      socket.on("live:participants", ({ participants: list }) => setParticipants(list || [])); socket.on("live:stage-requests", ({ requests: list }) => setRequests(list || []));
      socket.on("live:stage-request", (item: Request) => { if (isHost) setRequests((items) => items.some((x) => x.requestId === item.requestId) ? items : [...items, item]); });
      socket.on("live:stage-request-state", ({ requestId, state, userId }) => { if (isHost && state !== "pending") setRequests((items) => items.filter((x) => x.requestId !== requestId)); if (userId === me.id && state === "accepted") void startStageMedia(); });
      socket.on("live:stage-error", ({ message }) => window.alert(message)); socket.on("live:viewer-count", ({ delta }) => setViewerCount((v) => Math.max(0, v + Number(delta || 0))));
      socket.on("live:viewer-joined", ({ socketId }) => { if (isHost) void createOffer(socketId); });
      socket.on("live:stage-media-ready", ({ socketId }) => { if (isHost) void createOffer(socketId); });
      socket.on("live:chat", (message: ChatMessage) => setChat((items) => [...items.slice(-49), message]));
      socket.on("live:signal", async ({ from, signal }) => {
        let pc = peersRef.current.get(from);
        if (signal.type === "offer") { if (pc) pc.close(); pc = new RTCPeerConnection(ICE_SERVERS); peersRef.current.set(from, pc); pc.ontrack = (event) => { if (remoteVideoRef.current && event.streams[0]) { remoteVideoRef.current.srcObject = event.streams[0]; setRemoteReady(true); } }; pc.onicecandidate = (e) => { if (e.candidate) socket.emit("live:signal", { to: from, signal: { type: "ice", candidate: e.candidate } }); }; await pc.setRemoteDescription({ type: "offer", sdp: signal.sdp }); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer); socket.emit("live:signal", { to: from, signal: { type: "answer", sdp: answer.sdp } }); }
        else if (signal.type === "answer" && pc) await pc.setRemoteDescription({ type: "answer", sdp: signal.sdp });
        else if (signal.type === "ice" && pc && signal.candidate) { try { await pc.addIceCandidate(signal.candidate); } catch {} }
      });
      socket.on("live:user-left", ({ socketId }) => { peersRef.current.get(socketId)?.close(); peersRef.current.delete(socketId); });
      if (isHost) await startStageMedia(); if (!isHost && requestQuery.data?.state === "accepted") await startStageMedia(); if (cancelled) return;
    } catch (e) { console.error(e); } }; void setup();
    return () => { cancelled = true; socketRef.current?.disconnect(); peersRef.current.forEach((pc) => pc.close()); peersRef.current.clear(); streamRef.current?.getTracks().forEach((t) => t.stop()); };
  }, [sessionId, me?.id, session?.sessionId, isHost]);

  const sendChat = () => { if (!chatText.trim()) return; socketRef.current?.emit("live:chat", { sessionId, message: chatText }); setChatText(""); };
  const toggleMute = () => { const t = streamRef.current?.getAudioTracks()[0]; if (!t) return; t.enabled = !t.enabled; const muted = !t.enabled; setIsMuted(muted); socketRef.current?.emit("live:status", { sessionId, isMuted: muted, isVideoOff }); };
  const toggleVideo = () => { const t = streamRef.current?.getVideoTracks()[0]; if (!t) return; t.enabled = !t.enabled; const off = !t.enabled; setIsVideoOff(off); socketRef.current?.emit("live:status", { sessionId, isMuted, isVideoOff: off }); };
  const askToJoin = () => { socketRef.current?.emit("live:stage-request", { sessionId }); void requestStage.mutateAsync({ sessionId }).catch(() => undefined); };
  const accept = (requestId: string) => { socketRef.current?.emit("live:stage-decision", { sessionId, requestId, decision: "accept" }); void acceptRequest.mutateAsync({ requestId }).catch(() => undefined); };
  const reject = (requestId: string) => { socketRef.current?.emit("live:stage-decision", { sessionId, requestId, decision: "reject" }); void rejectRequest.mutateAsync({ requestId }).catch(() => undefined); };
  const leave = async () => { try { if (isHost) await endSession.mutateAsync({ sessionId }); else await leaveSession.mutateAsync({ sessionId }); } catch {} navigate("/live"); };
  const chooseGift = async (gift: any) => { if (!me || !session || !balance || !gift) return; try { const r = await sendGift.mutateAsync({ recipientId: Number(session.hostId), giftId: String(gift.id), quantity: 1, context: "live", contextId: sessionId, idempotencyKey: crypto.randomUUID() }); setBalance(Number(r.balance)); socketRef.current?.emit("live:gift", { sessionId, gift: { icon: r.gift.icon, name: r.gift.name } }); setShowGifts(false); } catch {} };
  if (!session) return <div className="min-h-screen bg-black text-white flex items-center justify-center">Chargement du Live...</div>;
  const stageVideo = <div className="relative w-full h-full overflow-hidden rounded-2xl bg-gray-950"><video ref={isHost ? localVideoRef : remoteVideoRef} autoPlay muted={isHost} playsInline className="w-full h-full object-cover" />{((isHost && isVideoOff) || (!isHost && !remoteReady)) && <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-center"><CameraOff size={44} className="mx-auto mb-2" />{isHost ? "Caméra désactivée" : "Connexion au Live..."}</div>}</div>;
  return <div className="h-[100dvh] bg-black text-white overflow-hidden relative">
    <LiveStageLayout layout={layout} participants={participants} video={stageVideo} />
    <header className="absolute top-0 left-0 right-0 z-30 p-4 flex items-center justify-between bg-gradient-to-b from-black/70 to-transparent"><div className="flex items-center gap-3"><button onClick={leave} className="w-10 h-10 rounded-full bg-black/45 flex items-center justify-center"><ArrowLeft /></button><div><p className="font-bold truncate max-w-[190px]">{session.title}</p><p className="text-xs text-gray-300">@{session.hostUsername}</p></div></div><div className="px-3 py-1.5 rounded-full bg-red-500/90 text-sm font-bold"><span className="animate-pulse">●</span> LIVE · <Users size={14} className="inline" /> {viewerCount}</div></header>
    <LiveStagePanel isHost={isHost} participants={participants} requests={requests} maxParticipants={Number(session.maxParticipants || 5)} myRequestPending={!!requestQuery.data} onRequestStage={askToJoin} onAccept={accept} onReject={reject} onRemove={(userId) => { void removeParticipant.mutateAsync({ sessionId, userId }); }} onMute={(userId, muted) => { void muteParticipant.mutateAsync({ sessionId, userId, muted }); }} />
    <div className="absolute right-3 bottom-28 z-30 flex flex-col gap-3">{(isHost || participants.some((p) => p.userId === me?.id && (p.role === "guest" || p.role === "admin"))) && <><button onClick={toggleVideo} className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">{isVideoOff ? <CameraOff /> : <Camera />}</button><button onClick={toggleMute} className="w-12 h-12 rounded-full bg-black/55 flex items-center justify-center">{isMuted ? <MicOff /> : <Mic />}</button></>}<button onClick={() => setShowGifts(true)} className="w-14 h-14 rounded-full bg-pink-500 flex items-center justify-center shadow-lg"><Gift /></button></div>
    <div className="absolute left-3 right-16 bottom-4 z-30"><div className="max-h-36 overflow-y-auto mb-2 space-y-1">{chat.map((m) => <div key={m.id} className="text-sm"><b className="text-yellow-300">{m.username}</b> {m.message}</div>)}</div><div className="flex gap-2"><input value={chatText} onChange={(e) => setChatText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && sendChat()} placeholder="Dire quelque chose..." className="flex-1 bg-black/65 border border-white/10 rounded-full px-4 py-3" /><button onClick={sendChat} className="w-12 h-12 rounded-full bg-white/15 flex items-center justify-center"><Send size={18} /></button></div></div>
    {showGifts && <div className="absolute inset-0 z-50 bg-black/70 flex items-end"><div className="w-full bg-gray-950 rounded-t-3xl p-5 max-h-[65vh] overflow-y-auto"><div className="flex justify-between mb-4"><div><h2 className="font-bold">🎁 Envoyer un cadeau</h2><p className="text-xs text-gray-400">Solde : 🪙 {balance.toLocaleString("fr-FR")}</p></div><button onClick={() => setShowGifts(false)}><X /></button></div><div className="grid grid-cols-4 gap-3">{gifts?.map((gift: any) => <button key={gift.id} disabled={balance < Number(gift.coins)} onClick={() => chooseGift(gift)} className="rounded-2xl bg-gray-900 p-3 disabled:opacity-40"><div className="text-4xl">{gift.icon}</div><p className="text-xs">{gift.name}</p><p className="text-[11px] text-yellow-400">🪙 {Number(gift.coins).toLocaleString("fr-FR")}</p></button>)}</div><div className="mt-4 text-xs text-gray-500 flex gap-2"><Heart size={14} /> Cadeaux animés en direct.</div></div></div>}
  </div>;
}
