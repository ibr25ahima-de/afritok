import React from "react";
import { Users } from "lucide-react";

interface UserTableProps {
  users: any[];
  onBan: (userId: number) => void;
  onUnban: (userId: number) => void;
  onSuspend: (userId: number, days: number) => void;
  onUnsuspend: (userId: number) => void;
  onWarn: (userId: number) => void;
  onView: (userId: number) => void;
}

export const UserTable: React.FC<UserTableProps> = ({
  users,
  onBan,
  onUnban,
  onSuspend,
  onUnsuspend,
  onWarn,
  onView,
}) => {
  return (
    <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 md:col-span-2">
      <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-2">
        <Users className="w-6 h-6 text-blue-400" />
        User Management
      </h2>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-purple-100">
          <thead className="bg-slate-800/50">
            <tr>
              <th className="p-3">ID</th>
              <th className="p-3">Nom</th>
              <th className="p-3">Téléphone</th>
              <th className="p-3">Statut</th>
              <th className="p-3">Action</th>
            </tr>
          </thead>

          <tbody>
            {users?.map((u: any) => (
              <tr key={u.id} className="border-b border-slate-700">
                <td className="p-3">#{u.id}</td>
                <td className="p-3">{u.name || "Sans nom"}</td>
                <td className="p-3">{u.phone}</td>
                <td className="p-3">
                  <div className="flex flex-col gap-1">
                    {u.isBanned ? (
                      <span className="text-red-400 font-bold">Banni</span>
                    ) : u.isSuspended ? (
                      <span className="text-orange-400 font-bold">Suspendu</span>
                    ) : (
                      <span className="text-green-400 font-bold">Actif</span>
                    )}
                  </div>
                </td>
                <td className="p-3">
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2 flex-wrap">
                      <button
                        onClick={() => onView(u.id)}
                        className="bg-blue-600 hover:bg-blue-500 text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        Voir
                      </button>

                      <button
                        onClick={() => onWarn(u.id)}
                        className="bg-yellow-600 hover:bg-yellow-500 text-white px-2 py-1 rounded text-xs transition-colors"
                      >
                        Avertir
                      </button>

                      {!u.isBanned ? (
                        <button
                          className="bg-red-600 hover:bg-red-500 px-2 py-1 rounded text-xs transition-colors"
                          onClick={() => onBan(u.id)}
                        >
                          Bannir
                        </button>
                      ) : (
                        <button
                          className="bg-green-600 hover:bg-green-500 px-2 py-1 rounded text-xs transition-colors"
                          onClick={() => onUnban(u.id)}
                        >
                          Débannir
                        </button>
                      )}
                    </div>

                    {!u.isSuspended ? (
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => onSuspend(u.id, 1)}
                          className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          Suspendre 1 j
                        </button>
                        <button
                          onClick={() => onSuspend(u.id, 7)}
                          className="bg-orange-600 hover:bg-orange-500 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          Suspendre 7 j
                        </button>
                        <button
                          onClick={() => onSuspend(u.id, 30)}
                          className="bg-orange-700 hover:bg-orange-600 text-white px-2 py-1 rounded text-xs transition-colors"
                        >
                          Suspendre 30 j
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => onUnsuspend(u.id)}
                        className="bg-green-600 hover:bg-green-500 text-white px-3 py-1 rounded text-xs transition-colors"
                      >
                        Lever la suspension
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
