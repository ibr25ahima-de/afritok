import { MessageCircle } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useLocation, useRoute } from "wouter";

export default function ProfileMessageLauncher() {
  const [, params] = useRoute("/profile/:userId");
  const [, navigate] = useLocation();
  const userId = params?.userId ? Number(params.userId) : 0;
  const { data: currentUser } = trpc.auth.me.useQuery();
  const { data: profile, isLoading } = trpc.user.getProfile.useQuery(
    { userId },
    { enabled: userId > 0 }
  );

  if (!userId || !currentUser || currentUser.id === userId || isLoading || !profile?.allowMessages) return null;

  return (
    <button
      type="button"
      onClick={() => navigate(`/inbox?userId=${userId}`)}
      className="fixed top-[calc(0.75rem+var(--afritok-safe-top))] right-[calc(0.75rem+var(--afritok-safe-right))] z-[85] flex min-h-11 items-center gap-2 rounded-full bg-red-500 px-4 font-semibold text-white shadow-lg transition hover:bg-red-600 active:scale-95 touch-manipulation"
      aria-label={`Envoyer un message à ${profile.name || "cet utilisateur"}`}
    >
      <MessageCircle size={20} />
      <span className="text-sm">Message</span>
    </button>
  );
}
