import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff, Gift, Grip, Mic, MicOff } from "lucide-react";

type Props = {
  isHostOrGuest: boolean;
  isVideoOff: boolean;
  isMuted: boolean;
  onToggleVideo: () => void;
  onToggleMute: () => void;
  onOpenGifts: () => void;
};

const STORAGE_KEY = "afritok:live-controls-position";
const DEFAULT = { x: 12, y: 42 };

export function LiveFloatingControls({ isHostOrGuest, isVideoOff, isMuted, onToggleVideo, onToggleMute, onOpenGifts }: Props) {
  const [position, setPosition] = useState(DEFAULT);
  const dragging = useRef(false);
  const pointerOffset = useRef({ x: 0, y: 0 });

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) setPosition({ x: saved.x, y: saved.y });
    } catch {}
  }, []);

  const clamp = (x: number, y: number) => ({ x: Math.max(4, Math.min(88, x)), y: Math.max(10, Math.min(82, y)) });
  const startDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    dragging.current = true;
    pointerOffset.current = { x: event.clientX - position.x / 100 * window.innerWidth, y: event.clientY - position.y / 100 * window.innerHeight };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const moveDrag = (event: React.PointerEvent<HTMLButtonElement>) => {
    if (!dragging.current) return;
    const next = clamp((event.clientX - pointerOffset.current.x) / window.innerWidth * 100, (event.clientY - pointerOffset.current.y) / window.innerHeight * 100);
    setPosition(next);
  };
  const endDrag = () => {
    if (!dragging.current) return;
    dragging.current = false;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(position)); } catch {}
  };

  return (
    <div className="absolute z-40 flex flex-col gap-2" style={{ left: `${position.x}%`, top: `${position.y}%` }}>
      <button type="button" onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} aria-label="Déplacer les commandes du Live" className="mx-auto w-9 h-7 rounded-full bg-black/70 border border-white/15 flex items-center justify-center touch-none cursor-move">
        <Grip size={16} />
      </button>
      <div className="flex flex-col gap-2 rounded-2xl bg-black/45 backdrop-blur-sm p-1.5">
        {isHostOrGuest && <>
          <button type="button" onClick={onToggleVideo} aria-label={isVideoOff ? "Activer la caméra" : "Désactiver la caméra"} className="w-11 h-11 rounded-full bg-black/65 flex items-center justify-center">{isVideoOff ? <CameraOff size={20} /> : <Camera size={20} />}</button>
          <button type="button" onClick={onToggleMute} aria-label={isMuted ? "Activer le micro" : "Couper le micro"} className="w-11 h-11 rounded-full bg-black/65 flex items-center justify-center">{isMuted ? <MicOff size={20} /> : <Mic size={20} />}</button>
        </>}
        <button type="button" onClick={onOpenGifts} aria-label="Envoyer un cadeau" className="w-11 h-11 rounded-full bg-pink-500 flex items-center justify-center shadow-lg"><Gift size={20} /></button>
      </div>
    </div>
  );
}
