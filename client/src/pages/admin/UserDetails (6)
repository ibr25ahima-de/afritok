import React, { useState } from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function UserDetails() {
  const [, params] = useRoute("/admin/users/:userId");
  const userId = Number(params?.userId);

  const { data: user, isLoading, error } =
    trpc.admin.getUserDetails.useQuery({
      userId,
    });

  const banUser = trpc.admin.banUser.useMutation();
  const unbanUser = trpc.admin.unbanUser.useMutation();
  const suspendUser = trpc.admin.suspendUser.useMutation();
  const unsuspendUser = trpc.admin.unsuspendUser.useMutation();
  const sendWarning = trpc.admin.sendWarning.useMutation();

  const deleteVideo = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const deleteComment = trpc.admin.deleteComment.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  const stats = user?.stats;
  const balance = user?.balance;

  if (isLoading) {
    return (
      <div className="text-white text-center p-10">
        Chargement...
      </div>
    );
  }

  if (!user) {
    return (
      <div className="text-red-400 text-center p-10">
        Utilisateur introuvable.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">
        Détails de l'utilisateur
      </h1>

      <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-6 flex flex-col md:flex-row items-center gap-6">

        <img
          src={user?.avatarUrl || "/default-avatar.png"}
          alt="Avatar"
          className="w-28 h-28 rounded-full object-cover border-4 border-purple-600"
        />

        <div className="flex-1">
          <h2 className="text-3xl font-bold text-white">
            {user?.name || "Sans nom"}
          </h2>

          <p className="text-gray-300">
            @{user?.phone}
          </p>

          <p className="text-gray-400 mt-2">
            {user?.bio || "Aucune bio"}
          </p>

          <div className="mt-4">
            {user?.isBanned ? (
              <span className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                🚫 Compte banni
              </span>
            ) : user?.isSuspended ? (
              <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                ⏸️ Compte suspendu
              </span>
            ) : (
              <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                ✅ Compte actif
              </span>
            )}
          </div>

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              onClick={() => {
                if (!confirm("Voulez-vous vraiment envoyer un avertissement à cet utilisateur ?")) return;
                const reason = prompt("Motif de l'avertissement");
                if (!reason) return;
                const message = prompt("Message à envoyer");
                if (message) {
                  sendWarning.mutate({ userId, reason, message });
                }
              }}
              className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg"
            >
              ⚠️ Avertir
            </button>

            <button
              onClick={() => {
                if (!confirm("Voulez-vous vraiment suspendre cet utilisateur ?")) return;
                const days = prompt("Nombre de jours de suspension");
                if (!days) return;
                const reason = prompt("Motif de la suspension");
                if (!reason) return;
                suspendUser.mutate({
                  userId,
                  days: Number(days),
                  reason,
                });
              }}
              className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2 rounded-lg"
            >
              ⏸ Suspendre
            </button>

            <button
              onClick={() => {
                if (!confirm("Voulez-vous vraiment bannir cet utilisateur ? Cette action est irréversible.")) return;
                const reason = prompt("Motif du bannissement");
                if (reason) {
                  banUser.mutate({ userId, reason });
                }
              }}
              className="bg-red-600 hover:bg-red-500 text-white px-4 py-2 rounded-lg"
            >
              🚫 Bannir
            </button>

            <button
              onClick={() => {
                if (!confirm("Voulez-vous vraiment débannir cet utilisateur ?")) return;
                unbanUser.mutate({ userId });
              }}
              className="bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-lg"
            >
              ✅ Débannir
            </button>
          </div>

          <div className="flex gap-6 mt-4 text-white">
            <div>
              <strong>{stats?.followers}</strong>
              <p className="text-gray-400 text-sm">Abonnés</p>
            </div>

            <div>
              <strong>{stats?.following}</strong>
              <p className="text-gray-400 text-sm">Abonnements</p>
            </div>

            <div>
              <strong>{stats?.videos}</strong>
              <p className="text-gray-400 text-sm">Vidéos</p>
            </div>
          </div>
        </div>

      </div>

      <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-6 mb-6">
        <h2 className="text-xl font-bold text-white mb-4">
          Informations générales
        </h2>

        <p className="text-white">
          <strong>Nom :</strong> {user?.name || "Sans nom"}
        </p>

        <p className="text-white">
          <strong>Téléphone :</strong> {user?.phone}
        </p>

        <p className="text-white">
          <strong>Email :</strong> {user?.email || "Non renseigné"}
        </p>

        <p className="text-white">
          <strong>Pays :</strong> {user?.country || "Non renseigné"}
        </p>

        <p className="text-white">
          <strong>Bio :</strong> {user?.bio || "Aucune bio"}
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Vidéos</p>
          <p className="text-2xl font-bold text-white">{stats?.videos}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Commentaires</p>
          <p className="text-2xl font-bold text-white">{stats?.comments}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Likes</p>
          <p className="text-2xl font-bold text-white">{stats?.likes}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Favoris</p>
          <p className="text-2xl font-bold text-white">{stats?.favorites}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Abonnés</p>
          <p className="text-2xl font-bold text-white">{stats?.followers}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Abonnements</p>
          <p className="text-2xl font-bold text-white">{stats?.following}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Revenus</p>
          <p className="text-2xl font-bold text-green-400">{balance?.totalEarnings?.toFixed(2) ?? "0.00"} $</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Retraits</p>
          <p className="text-2xl font-bold text-red-400">{balance?.totalWithdrawals?.toFixed(2) ?? "0.00"} $</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Solde disponible</p>
          <p className="text-2xl font-bold text-emerald-400">
            {balance?.available?.toFixed(2) ?? "0.00"} $
          </p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Avertissements</p>
          <p className="text-2xl font-bold text-yellow-400">
            {user?.warningCount ?? 0}
          </p>
        </div>

      </div>

      {/* ── Historique des avertissements et sanctions ── */}
      <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Historique des avertissements et sanctions
        </h2>

        {user?.warnings?.length ? (
          <div className="space-y-3">
            {user.warnings.map((w: any, index: number) => (
              <div
                key={index}
                className="bg-slate-800 rounded-lg p-4 border-l-4 border-yellow-500"
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-yellow-400 font-semibold">
                    ⚠️ Avertissement #{index + 1}
                  </span>
                  <span className="text-gray-500 text-sm">
                    {w.createdAt || "Date inconnue"}
                  </span>
                </div>

                <p className="text-white mb-1">
                  <strong>Motif :</strong> {w.reason || "Non spécifié"}
                </p>

                {w.message && (
                  <p className="text-gray-400 text-sm">
                    <strong>Message :</strong> {w.message}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">
            Aucun avertissement ni sanction pour cet utilisateur.
          </p>
        )}
      </div>

      <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-6">
        <h2 className="text-2xl font-bold text-white mb-4">
          Vidéos publiées
        </h2>

        {user?.videos?.length ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {user.videos.map((video: any) => (
              <div
                key={video.id}
                className="bg-slate-800 rounded-lg overflow-hidden"
              >
                <video
                  src={video.videoUrl}
                  controls
                  className="w-full h-40 object-cover"
                />

                <div className="p-3">
                  <p className="text-white font-semibold">
                    {video.title || "Sans titre"}
                  </p>

                  <p className="text-gray-400 text-sm">
                    👁 {video.views} • ❤️ {video.likes}
                  </p>

                  <button
                    onClick={() => {
                      if (confirm("Supprimer définitivement cette vidéo ?")) {
                        deleteVideo.mutate({ videoId: video.id });
                      }
                    }}
                    className="mt-2 w-full rounded bg-red-600 px-3 py-2 text-white hover:bg-red-700"
                  >
                    🗑️ Supprimer
                  </button>
                </div>

                <div className="mt-4">
                  <h3 className="mb-2 text-sm font-bold text-gray-300">
                    Commentaires ({video.comments?.length || 0})
                  </h3>

                  {video.comments?.length ? (
                    <div className="space-y-2">
                      {video.comments.map((comment: any) => (
                        <div
                          key={comment.id}
                          className="rounded-lg bg-slate-900 p-3 border border-slate-700"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <p className="text-sm font-semibold text-purple-300">
                                {comment.userName || comment.phone || "Utilisateur"}
                              </p>

                              <p className="text-white mt-1">
                                {comment.text}
                              </p>
                            </div>

                            <div className="flex gap-2 shrink-0">
                              {/* ⚠️ Avertir l'auteur du commentaire */}
                              <button
                                onClick={() => {
                                  if (
                                    !confirm(
                                      "Voulez-vous vraiment avertir l'utilisateur qui a écrit ce commentaire ?"
                                    )
                                  ) {
                                    return;
                                  }

                                  const reason = prompt("Motif de l'avertissement");
                                  if (!reason) return;

                                  const message = prompt("Message à envoyer");
                                  if (!message) return;

                                  sendWarning.mutate({
                                    userId: comment.userId,
                                    reason,
                                    message,
                                  });
                                }}
                                className="bg-yellow-600 hover:bg-yellow-500 text-white px-3 py-1.5 rounded-lg text-sm"
                              >
                                ⚠️ Avertir
                              </button>

                              {/* 🗑️ Supprimer uniquement ce commentaire */}
                              <button
                                onClick={() => {
                                  if (
                                    !confirm(
                                      "Voulez-vous vraiment supprimer uniquement ce commentaire ?"
                                    )
                                  ) {
                                    return;
                                  }

                                  deleteComment.mutate({
                                    commentId: comment.id,
                                  });
                                }}
                                className="bg-red-600 hover:bg-red-500 text-white px-3 py-1.5 rounded-lg text-sm"
                              >
                                🗑️ Supprimer
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">
                      Aucun commentaire.
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400">
            Cet utilisateur n'a publié aucune vidéo.
          </p>
        )}
      </div>
    </div>
  );
}
