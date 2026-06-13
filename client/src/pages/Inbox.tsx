import { MessageCircle, Search } from "lucide-react";

export default function Inbox() {
  const conversations = [
    {
      id: 1,
      name: "Créateur 1",
      message: "Salut, comment vas-tu ?",
      time: "12:30",
    },
    {
      id: 2,
      name: "Créateur 2",
      message: "Merci pour ton abonnement",
      time: "10:15",
    },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold mb-4">Messages</h1>

        <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher..."
            className="bg-transparent outline-none ml-2 flex-1"
          />
        </div>
      </div>

      <div className="p-4 space-y-3">
        {conversations.map((conversation) => (
          <div
            key={conversation.id}
            className="bg-gray-900 rounded-xl p-4 flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-red-500 flex items-center justify-center">
                <MessageCircle size={20} />
              </div>

              <div>
                <p className="font-semibold">{conversation.name}</p>
                <p className="text-sm text-gray-400">
                  {conversation.message}
                </p>
              </div>
            </div>

            <span className="text-xs text-gray-500">
              {conversation.time}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
