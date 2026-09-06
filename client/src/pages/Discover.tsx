import { useState } from "react";
import { Search, UserPlus, User } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";

export default function Discover() {
  const { user: currentUser } = useAuth();
  const { data: users = [], isLoading } = trpc.user.getAll.useQuery();
  const [followingUsers, setFollowingUsers] = useState<number[]>([]);
  const [search, setSearch] = useState("");

  const followMutation = trpc.follower.toggle.useMutation({
    onSuccess: (data, variables) => {
      if (data.following) setFollowingUsers((prev) => [...prev, variables.userId]);
      else setFollowingUsers((prev) => prev.filter((id) => id !== variables.userId));
    },
  });

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const visibleUsers = users
    .filter((user) => user.id !== currentUser?.id)
    .filter((user) => !normalizedSearch || (user.name || `Utilisateur ${user.id}`).toLocaleLowerCase().includes(normalizedSearch));

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-2xl font-bold mb-4">Découvrir</h1>
        <div className="flex items-center bg-gray-900 rounded-lg px-3 py-2">
          <Search size={18} />
          <input value={search} onChange={(e) => setSearch(e.target.value)} type="search" placeholder="Rechercher un utilisateur..." className="bg-transparent outline-none ml-2 flex-1" />
        </div>
      </div>

      <div className="p-4 space-y-4">
        {isLoading && <p className="text-center text-gray-400">Chargement...</p>}
        {!isLoading && visibleUsers.length === 0 && <p className="text-center text-gray-400">Aucun utilisateur trouvé.</p>}
        {visibleUsers.map((user) => (
          <div key={user.id} onClick={() => (window.location.href = `/profile/${user.id}`)} className="flex items-center justify-between bg-gray-900 rounded-xl p-4 cursor-pointer hover:bg-gray-800 transition">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 shrink-0 rounded-full bg-red-500 flex items-center justify-center overflow-hidden">
                {user.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : <User size={22} />}
              </div>
              <div className="min-w-0">
                <p className="font-semibold truncate">{user.name || `Utilisateur ${user.id}`}</p>
                {user.country && <p className="text-sm text-gray-400 truncate">{user.country}</p>}
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); followMutation.mutate({ userId: user.id }); }} disabled={followMutation.isPending} className={`px-4 py-2 rounded-lg flex items-center gap-2 ${followingUsers.includes(user.id) ? "bg-gray-700" : "bg-red-500"}`}>
              <UserPlus size={16} />
              {followingUsers.includes(user.id) ? "Abonné" : "Suivre"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
