import { Search, UserPlus } from "lucide-react";

export default function Discover() {
  const users = [
    { id: 1, name: "Créateur 1", followers: "12K" },
    { id: 2, name: "Créateur 2", followers: "8K" },
    { id: 3, name: "Créateur 3", followers: "25K" },
    { id: 4, name: "Créateur 4", followers: "5K" },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold mb-4">Découvrir</h1>

        <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            className="bg-transparent outline-none ml-2 flex-1"
          />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {users.map((user) => (
          <div
            key={user.id}
            className="flex items-center justify-between bg-gray-900 rounded-lg p-4"
          >
            <div>
              <p className="font-semibold">{user.name}</p>
              <p className="text-sm text-gray-400">
                {user.followers} abonnés
              </p>
            </div>

            <button className="bg-red-500 px-4 py-2 rounded-lg flex items-center gap-2">
              <UserPlus size={16} />
              Suivre
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
