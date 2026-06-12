import { MessageCircle } from "lucide-react";

export default function Inbox() {
  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold">Messages</h1>
      </div>

      <div className="p-4">
        <div className="bg-gray-900 rounded-xl p-4 flex items-center gap-3">
          <MessageCircle size={24} />
          <div>
            <p className="font-semibold">Messagerie Afritok</p>
            <p className="text-sm text-gray-400">
              Aucun message pour le moment
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
