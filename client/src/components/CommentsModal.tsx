import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { X, Send, User } from "lucide-react";

interface CommentsModalProps {
videoId: number;
onClose: () => void;
}

export default function CommentsModal({ videoId, onClose }: CommentsModalProps) {
const [newComment, setNewComment] = useState("");

const commentsQuery = trpc.comment.getByVideo.useQuery(
{ videoId },
{
refetchOnWindowFocus: false,
refetchOnMount: true,
}
);

const createCommentMutation = trpc.comment.create.useMutation();

const handleSubmitComment = async () => {
if (!newComment.trim()) return;

try {
  const res = await createCommentMutation.mutateAsync({
    videoId,
    text: newComment,
  });

  console.log("COMMENT SENT", res);

  setNewComment("");

  // refresh commentaires
  await commentsQuery.refetch();

  // 💰 MONETIZATION FEEDBACK (on garde tout)
  if (res?.earning?.success) {
    alert("💰 + gain commentaire !");
  }

  if (res?.earning?.shadow) {
    alert("⚠️ Limite atteinte aujourd'hui");
  }

  if (res?.earning?.reason === "too_fast") {
    alert("🚫 Tu spam trop");
  }

  if (res?.earning?.reason === "duplicate") {
    alert("⚠️ Commentaire déjà compté");
  }

} catch (error) {
  console.error("Comment error", error);
}

};

return (
<div className="fixed inset-0 bg-black/80 z-50 flex items-end">
<div className="bg-slate-900 w-full h-[85vh] flex flex-col rounded-t-lg">

    {/* Header */}
    <div className="border-b border-purple-800/30 p-4 flex items-center justify-between">
      <h2 className="text-white font-semibold">Comments</h2>
      <button
        onClick={onClose}
        className="text-purple-400 hover:text-purple-300"
      >
        <X className="w-5 h-5" />
      </button>
    </div>

    {/* Comments List */}
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      {commentsQuery.isLoading ? (
        <p className="text-purple-300 text-center py-8">
          Chargement...
        </p>
      ) : commentsQuery.data && commentsQuery.data.length > 0 ? (
        commentsQuery.data.map((comment) => (
          <div key={comment.id} className="flex gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-semibold text-sm">
                Creator #{comment.userId}
              </p>
              <p className="text-purple-300 text-sm mt-1">
                {comment.text}
              </p>
              <p className="text-gray-500 text-xs mt-1">
                {new Date(comment.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        ))
      ) : (
        <p className="text-purple-300 text-center py-8">
          No comments yet
        </p>
      )}
    </div>

    {/* Comment Input */}
    <div className="border-t border-purple-800/30 p-4 flex gap-2">
      <input
        type="text"
        value={newComment}
        onChange={(e) => setNewComment(e.target.value)}
        placeholder="Add a comment..."
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            handleSubmitComment();
          }
        }}
        className="flex-1 bg-slate-800 border border-purple-800/50 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600 text-sm"
      />

      <Button
        onClick={handleSubmitComment}
        disabled={!newComment.trim() || createCommentMutation.isPending}
        className="bg-purple-600 hover:bg-purple-700 text-white p-2"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>

  </div>
</div>

);
}
