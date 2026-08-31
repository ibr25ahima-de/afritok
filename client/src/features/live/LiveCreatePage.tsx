import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { LiveCreatePanel } from "./LiveCreatePanel";
import type { LiveStageCapacity } from "./live-stage-rules";
import type { LiveLayoutId } from "./live-layouts";

export function LiveCreatePage() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<LiveStageCapacity>(5);
  const [layout, setLayout] = useState<LiveLayoutId>("spotlight");
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);
  const createSession = trpc.live.createSession.useMutation();
  const startSession = trpc.live.startSession.useMutation();
  const start = async () => {
    if (!title.trim()) { setError("Donne un thème à ton Live."); return; }
    setError(""); setIsStarting(true);
    try {
      const created = await createSession.mutateAsync({ title: title.trim(), description: description.trim(), type: "video", isPublic: true, maxParticipants: capacity });
      await startSession.mutateAsync({ sessionId: created.sessionId });
      sessionStorage.setItem(`afritok:live-layout:${created.sessionId}`, layout);
      navigate(`/live/${created.sessionId}`);
    } catch (e: any) { setError(e?.message || "Impossible de démarrer le Live."); }
    finally { setIsStarting(false); }
  };
  return <div className="min-h-screen bg-black text-white"><header className="flex items-center gap-3 p-4"><button type="button" onClick={() => navigate("/feed")}><ArrowLeft /></button><h1 className="text-2xl font-bold">Live</h1></header><LiveCreatePanel title={title} description={description} capacity={capacity} layout={layout} isStarting={isStarting} error={error} onTitleChange={setTitle} onDescriptionChange={setDescription} onCapacityChange={setCapacity} onLayoutChange={setLayout} onStart={start} /></div>;
}
