import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { X, Send, User } from "lucide-react";

interface CommentsModalProps {
  videoId: number;
  onClose: () => void;
  onCommentAdded?: (commentCount: number) => void;
}

export default function CommentsModal({ videoId, onClose, onCommentAdded }: CommentsModalProps) {
  const [, navigate] = useLocation();
  const [newComment, setNewComment] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [visibleViewport, setVisibleViewport] = useState<{ top: number; height: number } | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const updateViewport = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;
      setVisibleViewport({
        top: Math.round(viewport.offsetTop),
        height: Math.round(viewport.height),
      });
    };

    updateViewport();
    window.visualViewport?.addEventListener("resize", updateViewport);
    window.visualViewport?.addEventListener("scroll", updateViewport);

    // Keep the comments composer at a fixed scale on mobile. Some Android
    // browsers can apply an extra zoom when the keyboard opens or when an
    // input receives focus, even when the viewport already disables pinch zoom.
    const preventGestureZoom = (event: Event) => event.preventDefault();
    const preventCtrlWheelZoom = (event: WheelEvent) => {
      if (event.ctrlKey) event.preventDefault();
    };
    document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
    document.addEventListener("gestureend", preventGestureZoom, { passive: false });
    document.addEventListener("wheel", preventCtrlWheelZoom, { passive: false });

    return () => {
      window.visualViewport?.removeEventListener("resize", updateViewport);
      window.visualViewport?.removeEventListener("scroll", updateViewport);
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
      document.removeEventListener("wheel", preventCtrlWheelZoom);
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

  useEffect(() => {
    if (commentsQuery.data) onCommentAdded?.(commentsQuery.data.length);
  }, [commentsQuery.data]);

  const handleSubmitComment = async () => {
    const text = newComment.trim();
    if (!text) return;

    setSubmitError(null);
    try {
      const res = await createCommentMutation.mutateAsync({ videoId, text });
      setNewComment("");
      const refreshedComments = await commentsQuery.refetch();
      onCommentAdded?.(refreshedComments.data?.length ?? 0);

      if (res?.earning?.success) alert("💰 + gain commentaire !");
      if (res?.earning?.shadow) alert("⚠️ Limite atteinte aujourd'hui");
      if (res?.earning?.reason === "too_fast") alert("🚫 Tu spam trop");
      if (res?.earning?.reason === "duplicate") alert("⚠️ Commentaire déjà compté");
    } catch (error) {
      console.error("Comment error", error);
      setSubmitError(error instanceof Error ? error.message : "Impossible d’envoyer le commentaire. Réessayez.");
    }
  };

  return createPortal(
    <div
      className="fixed inset-x-0 z-[300] flex items-end overflow-hidden bg-black/80"
      style={{ top: visibleViewport?.top ?? 0, height: visibleViewport?.height ?? "100dvh", width: "100%", maxWidth: "100%", minWidth: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Commentaires"
    >
      <div style={{ position: "absolute", top: 0, left: 0, zIndex: 9999, background: "red", color: "white", fontSize: 20, padding: 4 }}>
        {window.innerWidth} / {window.devicePixelRatio} / {window.visualViewport?.scale}
      </div>
      <div
        className="flex h-[min(70dvh,32rem)] max-h-full w-full min-h-0 flex-col overflow-hidden rounded-t-lg bg-slate-900 shadow-2xl"
        style={{ WebkitTextSizeAdjust: "100%" }}
      >
        <div className="flex items-center justify-between border-b border-purple-800/30 p-4">
          <h2 className="font-semibold text-white">Comments</h2>
          <button type="button" onClick={onClose} className="text-purple-400 hover:text-purple-300" aria-label="Fermer les commentaires">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
          {commentsQuery.isLoading ? (
            <p className="py-8 text-center text-purple-300">Chargement...</p>
          ) : commentsQuery.isError ? (
            <p className="py-8 text-center text-red-300">Impossible de charger les commentaires. Réessayez.</p>
          ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
            commentsQuery.data.map((comment) => (
              <div key={comment.id} className="flex gap-3">
                <button
                  type="button"
                  onClick={() => navigate(`/profile/${comment.userId}`)}
                  className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-purple-400 to-pink-400"
                  aria-label={`Voir le profil de ${comment.userName || "cet utilisateur"}`}
                >
                  <User className="h-4 w-4 text-white" />
                </button>
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => navigate(`/profile/${comment.userId}`)}
                    className="text-left text-sm font-semibold text-white hover:underline"
                  >
                    {comment.userName || "Utilisateur"}
                  </button>
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
          className="w-full shrink-0 border-t border-purple-800/30 bg-slate-900 p-4 pb-[max(1rem,env(safe-area-inset-bottom,0px))]"
        >
          {submitError && <p role="alert" className="mb-2 text-xs text-red-300">{submitError}</p>}
          <div className="mx-auto flex w-full min-w-0 max-w-2xl flex-col items-start gap-3">
            <div className="w-full min-w-0 rounded-2xl border border-purple-800/50 bg-slate-800 px-4 py-2">
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
                className="w-full min-w-0 border-none bg-transparent py-2 text-base text-white outline-none placeholder:text-gray-500"
                style={{ fontSize: "16px", lineHeight: "1.4", touchAction: "manipulation", WebkitTextSizeAdjust: "100%", WebkitAppearance: "none" }}
                aria-label="Écrire un commentaire"
              />
            </div>
            <button
              type="button"
              onClick={() => void handleSubmitComment()}
              disabled={!newComment.trim() || createCommentMutation.isPending}
              className="flex h-11 items-center justify-center gap-2 rounded-full bg-red-500 px-5 text-white transition-colors hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-70"
              aria-label="Envoyer le commentaire"
            >
              <Send className="h-5 w-5" />
              <span>Envoyer</span>
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
