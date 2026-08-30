import { useState } from "react";
import { useLocation } from "wouter";
import { LiveCreatePanel } from "@/features/live/LiveCreatePanel";
import { LIVE_STAGE_CAPACITIES, type LiveStageCapacity } from "@/../server/live/stage-rules";
import { trpc } from "@/lib/trpc";

export default function LiveCreate() {
  const [, navigate] = useLocation();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [capacity, setCapacity] = useState<LiveStageCapacity>(5);
  const [error, setError] = useState("");
  const [isStarting, setIsStarting] = useState(false);

  const createSession = trpc.live.createSession.useMutation();
  const startSession = trpc.live.startSession.useMutation();

  const start = async () => {
    if (!title.trim()) {
      setError("Donne un titre à ton Live.");
      return;
    }
    setIsStarting(true);
    setError("");
    try {
      const created = await createSession.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        type: "video",
        isPublic: true,
        maxParticipants: capacity,
      });
      await startSession.mutateAsync({ sessionId: created.sessionId });
      navigate(`/live/${created.sessionId}`);
    } catch (e: any) {
      setError(e?.message || "Impossible de démarrer le Live.");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <LiveCreatePanel
      title={title}
      description={description}
      capacity={capacity}
      isStarting={isStarting}
      error={error}
      onTitleChange={setTitle}
      onDescriptionChange={setDescription}
      onCapacityChange={setCapacity}
      onStart={start}
    />
  );
}
