import { 
  CircleHelp, 
  MessageCircle, 
  Mail, 
  Users, 
  FileText, 
  ShieldCheck, 
  Info, 
  Star, 
  Share2, 
  ChevronRight 
} from "lucide-react";
import { Card } from "@/components/ui/card";

export default function SupportSettings() {
  const supportItems = [
    { icon: <CircleHelp size={18} />, label: "Centre d'aide" },
    { icon: <MessageCircle size={18} />, label: "Signaler un problème" },
    { icon: <Mail size={18} />, label: "Nous contacter" },
    { icon: <Users size={18} />, label: "Règles de la communauté" },
    { icon: <FileText size={18} />, label: "Conditions d'utilisation" },
    { icon: <ShieldCheck size={18} />, label: "Politique de confidentialité" },
    { icon: <Info size={18} />, label: "À propos d'AfriTok" },
    { icon: <Star size={18} />, label: "Noter AfriTok" },
    { icon: <Share2 size={18} />, label: "Partager AfriTok" },
  ];

  return (
    <Card className="bg-gray-900 border-gray-800 p-6">
      <h2 className="text-xl font-bold mb-4">
        Assistance et à propos
      </h2>

      <div className="space-y-1">
        {supportItems.map((item, index) => (
          <button
            key={item.label}
            className={`w-full flex items-center justify-between p-4 hover:bg-white/5 transition ${
              index !== supportItems.length - 1 ? "border-b border-gray-800" : ""
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-gray-400">{item.icon}</span>
              <span>{item.label}</span>
            </div>
            <ChevronRight size={18} className="text-gray-600" />
          </button>
        ))}
      </div>
    </Card>
  );
}
