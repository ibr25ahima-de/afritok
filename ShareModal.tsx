import { X, MessageCircle, Share2, Mail, Link as LinkIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ShareModalProps {
  videoTitle?: string;
  videoUrl?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ videoTitle, videoUrl, isOpen, onClose }: ShareModalProps) {
  if (!isOpen) return null;

  const shareUrl = videoUrl || window.location.href;
  const shareText = `Check out this amazing video on Afritok: ${videoTitle || "Video"}`;

  const handleShare = (platform: string) => {
    let url = "";
    switch (platform) {
      case "whatsapp":
        url = `https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`;
        break;
      case "twitter":
        url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(shareUrl)}`;
        break;
      case "facebook":
        url = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`;
        break;
      case "email":
        url = `mailto:?subject=${encodeURIComponent(videoTitle || "Check this out")}&body=${encodeURIComponent(shareText)}`;
        break;
      case "copy":
        navigator.clipboard.writeText(shareUrl);
        alert("Link copied to clipboard!");
        return;
    }
    if (url) window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center">
      <div className="bg-slate-900 rounded-lg p-6 max-w-sm w-full mx-4 border border-purple-800/50">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-white font-semibold text-lg">Share Video</h2>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleShare("whatsapp")}
            className="w-full flex items-center gap-3 bg-green-600 hover:bg-green-700 text-white p-3 rounded-lg transition"
          >
            <MessageCircle className="w-5 h-5" />
            <span>Share on WhatsApp</span>
          </button>

          <button
            onClick={() => handleShare("twitter")}
            className="w-full flex items-center gap-3 bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            <span>Share on Twitter</span>
          </button>

          <button
            onClick={() => handleShare("facebook")}
            className="w-full flex items-center gap-3 bg-blue-700 hover:bg-blue-800 text-white p-3 rounded-lg transition"
          >
            <Share2 className="w-5 h-5" />
            <span>Share on Facebook</span>
          </button>

          <button
            onClick={() => handleShare("email")}
            className="w-full flex items-center gap-3 bg-purple-600 hover:bg-purple-700 text-white p-3 rounded-lg transition"
          >
            <Mail className="w-5 h-5" />
            <span>Share via Email</span>
          </button>

          <button
            onClick={() => handleShare("copy")}
            className="w-full flex items-center gap-3 bg-slate-700 hover:bg-slate-600 text-white p-3 rounded-lg transition"
          >
            <LinkIcon className="w-5 h-5" />
            <span>Copy Link</span>
          </button>
        </div>
      </div>
    </div>
  );
}
