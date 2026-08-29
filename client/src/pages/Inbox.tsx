import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, MessageCircle, Search, Send, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";

export default function Inbox() {
  const [, navigate] = useLocation();
  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const initialConversationId = Number(params.get("conversationId") || 0);
  const initialUserId = Number(params.get("userId") || 0);
  const [conversationId, setConversationId] = useState(initialConversationId);
  const [recipientId, setRecipientId] = useState(initialUserId);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const { data: currentUser } = trpc.auth.me.useQuery();
  const conversationsQuery = trpc.directMessages.getUserConversations.useQuery({ limit: 50, offset: 0 });
  const messagesQuery = trpc.directMessages.getConversationMessages.useQuery(
    { conversationId, limit: 100, offset: 0 },
    { enabled: conversationId > 0, refetchInterval: 3000 }
  );
  const createConversation = trpc.directMessages.getOrCreateConversation.useMutation({
    onSuccess: (data) => {
      if (data.success && data.conversationId) {
        setConversationId(data.conversationId);
        setError("");
      } else setError(data.error || "Impossible d'ouvrir la conversation.");
    },
    onError: (e) => setError(e.message),
  });
  const sendMessage = trpc.directMessages.sendDirectMessage.useMutation({
    onSuccess: () => {
      setContent("");
      messagesQuery.refetch();
      conversationsQuery.refetch();
    },
    onError: (e) => setError(e.message),
  });

  useEffect(() => {
    if (initialUserId > 0 && !initialConversationId) createConversation.mutate({ userId: initialUserId });
  }, []);

  const conversations = conversationsQuery.data || [];
  const messages = messagesQuery.data || [];
  const selectedConversation = conversations.find((c: any) => c.id === conversationId);

  const selectConversation = (conversation: any) => {
    setConversationId(conversation.id);
    if (currentUser?.id) {
      const otherId = conversation.participant1Id === currentUser.id ? conversation.participant2Id : conversation.participant1Id;
      setRecipientId(otherId);
    }
    setError("");
  };

  const handleSend = () => {
    if (!content.trim() || !conversationId || !recipientId) return;
    setError("");
    sendMessage.mutate({ conversationId, recipientId, content: content.trim() });
  };

  const backToConversations = () => {
    setConversationId(0);
    setError("");
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] overflow-hidden bg-black text-white flex flex-col">
      <header className="shrink-0 p-4 border-b border-gray-800 flex items-center gap-3">
        <button onClick={() => navigate("/feed")} aria-label="Retour au fil">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-bold">Messages</h1>
      </header>

      <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
        {/* On mobile, show either the conversation list or the active chat, never both stacked vertically. */}
        <aside
          className={`${conversationId ? "hidden md:block" : "block"} md:w-80 md:shrink-0 border-b md:border-b-0 md:border-r border-gray-800 p-4 overflow-y-auto`}
        >
          <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2 mb-4">
            <Search size={18} />
            <input placeholder="Rechercher..." className="bg-transparent outline-none ml-2 flex-1 min-w-0" />
          </div>
          <div className="space-y-2">
            {conversations.length === 0 && <p className="text-gray-500 text-sm">Aucune conversation.</p>}
            {conversations.map((conversation: any) => (
              <button
                key={conversation.id}
                onClick={() => selectConversation(conversation)}
                className={`w-full text-left rounded-xl p-3 flex items-center gap-3 ${conversation.id === conversationId ? "bg-gray-800" : "bg-gray-900"}`}
              >
                <div className="w-11 h-11 shrink-0 rounded-full bg-red-500 flex items-center justify-center">
                  <MessageCircle size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate">Conversation #{conversation.id}</p>
                  <p className="text-xs text-gray-400">Appuyez pour ouvrir</p>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <main className={`${!conversationId ? "hidden md:flex" : "flex"} flex-1 flex-col min-w-0 min-h-0 overflow-hidden`}>
          <div className="shrink-0 p-4 border-b border-gray-800 font-semibold flex items-center gap-3">
            <button className="md:hidden" onClick={backToConversations} aria-label="Retour aux conversations">
              <ArrowLeft size={22} />
            </button>
            <span className="truncate">
              {selectedConversation ? `Conversation #${selectedConversation.id}` : "Nouvelle conversation"}
            </span>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-3 overscroll-contain">
            {error && <div className="bg-red-900/40 border border-red-700 rounded-lg p-3 text-sm">{error}</div>}
            {!conversationId ? (
              <div className="h-full flex items-center justify-center text-gray-500">Sélectionnez une conversation.</div>
            ) : (
              messages.map((message: any) => (
                <div key={message.id} className="flex">
                  <div className="max-w-[80%] bg-gray-800 rounded-2xl px-4 py-2 break-words">
                    <p>{message.content}</p>
                    <p className="text-[10px] text-gray-500 mt-1">
                      {message.sentAt ? new Date(message.sentAt).toLocaleString() : ""}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>

          {conversationId && (
            <div
              className="shrink-0 sticky bottom-0 z-20 p-3 sm:p-4 border-t border-gray-800 bg-black/95 backdrop-blur flex items-center gap-2"
              style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
            >
              <input
                value={content}
                onChange={(e) => setContent(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSend();
                }}
                placeholder="Écrire un message..."
                className="flex-1 min-w-0 h-12 bg-gray-900 rounded-full px-4 py-3 outline-none"
              />
              <button
                onClick={handleSend}
                disabled={!content.trim() || sendMessage.isPending}
                aria-label="Envoyer le message"
                className="w-12 h-12 shrink-0 rounded-full bg-red-500 flex items-center justify-center disabled:opacity-50 touch-manipulation"
              >
                {sendMessage.isPending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
