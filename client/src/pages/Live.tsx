import { useRoute } from "wouter";
import { LiveLobby } from "@/features/live/LiveLobby";
import { LiveCreatePage } from "@/features/live/LiveCreatePage";
import { LiveRoom } from "@/features/live/LiveRoom";

export default function Live() {
  const [, createParams] = useRoute("/live/create");
  const [, params] = useRoute("/live/:sessionId");
  if (createParams) return <LiveCreatePage />;
  if (params?.sessionId) return <LiveRoom />;
  return <LiveLobby />;
}
