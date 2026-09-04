import { Share2, ChevronRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";

export default function SupportSettings() {
  const shareAfriTok = async () => {
    const shareData = { title: "AfriTok", text: "Découvre AfriTok", url: window.location.origin };
    try {
      if (navigator.share) await navigator.share(shareData);
      else {
        await navigator.clipboard.writeText(window.location.origin);
        toast.success("Lien AfriTok copié");
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Impossible de partager AfriTok");
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">Partager AfriTok</h2>
      <button onClick={shareAfriTok} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition">
        <div className="flex items-center gap-3"><Share2 size={18} className="text-gray-400" /><span>Partager AfriTok</span></div>
        <ChevronRight size={18} className="text-gray-600" />
      </button>
    </Card>
  );
}
