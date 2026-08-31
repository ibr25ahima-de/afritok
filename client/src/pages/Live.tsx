import { useRoute } from "wouter";
import { LiveLobby } from "@/features/live/LiveLobby";
import { LiveCreatePage } from "@/features/live/LiveCreatePage";
import { LiveRoom } from "@/features/live/LiveRoom";

export default function Live() {
  const [, params] = useRoute("/live/:sessionId");
  const [, createParams] = useRoute("/live/create");
  if (params?.sessionId) return <LiveRoom />;
  if (createParams) return <LiveCreatePage />;
  return <LiveLobby />;
}
