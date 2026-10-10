import { useEffect, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";
import { X, Send, User } from "lucide-react";

interface CommentsModalProps {
  videoId: number;
  onClose: () => void;
  onCommentAdded?: () => void;
}

export default function CommentsModal({ videoId, onClose, onCommentAdded }: CommentsModalProps) {
  const [newComment, setNewComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [keyboardInset, setKeyboardInset] = useState(0);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const updateKeyboardInset = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      const layoutHeight = document.documentElement.clientHeight || window.innerHeight;
      const inset = Math.max(0, layoutHeight - viewport.height - viewport.offsetTop);
      setKeyboardInset(Math.round(inset));
    };

    updateKeyboardInset();
    window.visualViewport?.addEventListener("resize", updateKeyboardInset);
    window.visualViewport?.addEventListener("scroll", updateKeyboardInset);

    return () => {
      window.visualViewport?.removeEventListener("resize", updateKeyboardInset);
      window.visualViewport?.removeEventListener("scroll", updateKeyboardInset);
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const commentsQuery = trpc.comment.getByVideo.useQuery(
    { videoId },
    {
      refetchOnWindowFocus: false,
      refetchOnMount: true,
    }
  );

  const createCommentMutation = trpc.comment.create.useMutation();

  const handleSubmitComment = async () => {
    const text = newComment.trim();
    if (!text) return;

    setSubmitError(null);
    try {
      const res = await createCommentMutation.mutateAsync({ videoId, text });
      setNewComment("");
      await commentsQuery.refetch();
      onCommentAdded?.();

      if (res?.earning?.success) alert("💰 + gain commentaire !");
      if (res?.earning?.shadow) alert("⚠️ Limite atteinte aujourd'hui");
      if (res?.earning?.reason === "too_fast") alert("🚫 Tu spam trop");
      if (res?.earning?.reason === "duplicate") alert("⚠️ Commentaire déjà compté");
    } catch (error) {
      console.error("Comment error", error);
      setSubmitError(error instanceof Error ? error.message : "Impossible d’envoyer le commentaire. Réessayez.");
    }
  };

  return (
    <div
      className="fixed inset-x-0 top-0 z-[300] flex items-end bg-black/80"
      style={{ bottom: keyboardInset }}
      role="dialog"
      aria-modal="true"
      aria-label="Commentaires"
    >
      <div
        className="flex h-[min(70dvh,32rem)] max-h-[calc(100dvh-env(safe-area-inset-top,0px))] w-full min-h-0 flex-col overflow-hidden rounded-t-lg bg-slate-900 shadow-2xl"
        style={{ WebkitTextSizeAdjust: "100%" }}
      >
        <div className="flex items-center justify-between border-b border-purple-800/30 p-4">
          <h2 className="font-semibold text-white">Comments</h2>
          <button type="button" onClick={onClose} className="text-purple-400 hover:text-purple-300" aria-label="Fermer les commentaires">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 pb-40">
          {commentsQuery.isLoading ? (
            <p className="py-8 text-center text-purple-300">Chargement...</p>
          ) : commentsQuery.isError ? (
            <p className="py-8 text-center text-red-300">Impossible de charger les commentaires. Réessayez.</p>
          ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
            commentsQuery.data.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400">
                  <User className="h-4 w-4 text-white" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">Creator #{comment.userId}</p>
                  <p className="mt-1 text-sm text-purple-300">{comment.text}</p>
                  <p className="mt-1 text-xs text-gray-500">{new Date(comment.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ))
          ) : (
            <p className="py-8 text-center text-purple-300">No comments yet</p>
          )}
        </div>

        <div
          className="fixed inset-x-0 z-[310] border-t border-purple-800/30 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
          style={{ bottom: keyboardInset }}
        >
          {submitError && <p role="alert" className="mb-2 text-xs text-red-300">{submitError}</p>}
          <div className="mx-auto w-full max-w-2xl space-y-3">
            <div className="rounded-2xl border border-purple-800/50 bg-slate-800 px-4 py-2">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              autoComplete="off"
              enterKeyHint="send"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSubmitComment();
              }}
              className="min-w-0 flex-1 border-none bg-transparent py-2 text-base text-white outline-none placeholder:text-gray-500"
              style={{ fontSize: "16px" }}
              aria-label="Écrire un commentaire"
            />
            </div>
            <div className="flex min-h-12 items-center justify-end">
            <button
              type="button"
              onClick={() => void handleSubmitComment()}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full p-1 transition-colors ${newComment.trim() ? "bg-red-500 text-white hover:bg-red-400" : "text-purple-400 hover:text-purple-300 disabled:text-gray-600"}`}
              aria-label="Envoyer le commentaire"
            >
              <Send className="h-5 w-5" />
            </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
