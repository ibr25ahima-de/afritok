import { useRoute } from "wouter";
import { LiveCreatePage } from "@/features/live/LiveCreatePage";
import { LiveRoom } from "@/features/live/LiveRoom";

export default function Live() {
  const [, params] = useRoute("/live/:sessionId");
  return params?.sessionId ? <LiveRoom /> : <LiveCreatePage />;
}
