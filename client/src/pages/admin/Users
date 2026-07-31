import React from "react";
import { trpc } from "@/lib/trpc";
import { UserTable } from "../../components/admin/UserTable";

export default function Users() {
  const { data: users, refetch: refetchUsers } = trpc.admin.getAllUsers.useQuery();
  
  const banUser = trpc.admin.banUser.useMutation({ onSuccess: () => refetchUsers() });
  const unbanUser = trpc.admin.unbanUser.useMutation({ onSuccess: () => refetchUsers() });
  const suspendUser = trpc.admin.suspendUser.useMutation({ onSuccess: () => refetchUsers() });
  const unsuspendUser = trpc.admin.unsuspendUser.useMutation({ onSuccess: () => refetchUsers() });
  const sendWarning = trpc.admin.sendWarning.useMutation({
    onSuccess: () => alert("Avertissement envoyé !")
  });

  const handleBan = (userId: number) => {
    const reason = prompt("Motif du bannissement");
    if (reason) banUser.mutate({ userId, reason });
  };

  const handleWarn = (userId: number) => {
    const reason = prompt("Motif de l'avertissement");
    if (!reason) return;
    const message = prompt("Message à envoyer");
    if (message) sendWarning.mutate({ userId, reason, message });
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">User Management</h1>
      <UserTable 
        users={users || []}
        onBan={handleBan}
        onUnban={(userId) => unbanUser.mutate({ userId })}
        onSuspend={(userId, days) => suspendUser.mutate({ userId, days, reason: `Suspension de ${days} jours` })}
        onUnsuspend={(userId) => unsuspendUser.mutate({ userId })}
        onWarn={handleWarn}
      />
    </div>
  );
}
