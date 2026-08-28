import { MessageCircle, Loader2 } from "lucide-react";
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
  const conversationMutation = trpc.directMessages.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      if (data.success && data.conversationId) {
        navigate(`/inbox?conversationId=${data.conversationId}&userId=${userId}`);
      }
    },
  });

  if (!userId || !currentUser || currentUser.id === userId || isLoading || !profile?.allowMessages) return null;

  return (
    <button
      type="button"
      disabled={conversationMutation.isPending}
      onClick={() => conversationMutation.mutate({ userId })}
      className="fixed bottom-28 right-4 z-[80] flex items-center gap-2 rounded-full bg-red-500 px-5 py-3 font-semibold text-white shadow-lg hover:bg-red-600 disabled:opacity-60"
      aria-label={`Envoyer un message à ${profile.name || "cet utilisateur"}`}
    >
      {conversationMutation.isPending ? <Loader2 size={20} className="animate-spin" /> : <MessageCircle size={20} />}
      Message
    </button>
  );
}
