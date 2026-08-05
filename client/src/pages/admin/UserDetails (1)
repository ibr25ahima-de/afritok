import React from "react";
import { useRoute } from "wouter";
import { trpc } from "@/lib/trpc";

export default function UserDetails() {
  const [, params] = useRoute("/admin/users/:id");

  const { data, isLoading } =
    trpc.admin.getUserDetails.useQuery({
      userId: Number(params?.id),
    });

  const deleteVideo = trpc.admin.deleteVideo.useMutation({
    onSuccess: () => {
      window.location.reload();
    },
  });

  if (isLoading) {
    return <div className="text-white p-6">Chargement...</div>;
  }

  if (!data) {
    return <div className="text-red-500 p-6">Utilisateur introuvable.</div>;
  }

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-3xl font-bold text-white">
        Détails de l'utilisateur
      </h1>

      {/* ── Informations personnelles ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Nom</h3>
          <p className="text-white text-xl font-bold">
            {data.name || "Sans nom"}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Téléphone</h3>
          <p className="text-white text-xl font-bold">
            {data.phone}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Rôle</h3>
          <p className="text-indigo-400 text-xl font-bold capitalize">
            {data.role}
          </p>
        </div>
      </div>

      {/* ── Solde & Finances ── */}
      <h2 className="text-2xl font-bold text-white mt-8">Finances</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Solde total</h3>
          <p className="text-green-400 text-2xl font-bold">
            {data.totalEarnings}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Retraits totaux</h3>
          <p className="text-red-400 text-2xl font-bold">
            {data.totalWithdrawals}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Historique des gains</h3>
          <p className="text-yellow-400 text-2xl font-bold">
            {data.stats.earnings}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Historique des retraits</h3>
          <p className="text-cyan-400 text-2xl font-bold">
            {data.stats.withdrawals}
          </p>
        </div>
      </div>

      {/* ── Statistiques d'engagement ── */}
      <h2 className="text-2xl font-bold text-white mt-8">Statistiques d'engagement</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Vidéos</h3>
          <p className="text-blue-400 text-2xl font-bold">
            {data.stats.videos}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Commentaires</h3>
          <p className="text-emerald-400 text-2xl font-bold">
            {data.stats.comments}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Likes reçus</h3>
          <p className="text-pink-400 text-2xl font-bold">
            {data.stats.likes}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Favoris</h3>
          <p className="text-orange-400 text-2xl font-bold">
            {data.stats.favorites}
          </p>
        </div>
      </div>

      {/* ── Abonnements ── */}
      <h2 className="text-2xl font-bold text-white mt-8">Réseau social</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Abonnés</h3>
          <p className="text-teal-400 text-2xl font-bold">
            {data.stats.followers}
          </p>
        </div>

        <div className="bg-purple-900/30 border border-purple-700 rounded-lg p-5">
          <h3 className="text-purple-300 text-sm">Abonnements</h3>
          <p className="text-violet-400 text-2xl font-bold">
            {data.stats.following}
          </p>
        </div>
      </div>

      {/* ── Vidéos de l'utilisateur ── */}
      <h2 className="text-2xl font-bold text-white mt-8">Vidéos de l'utilisateur</h2>
      <div className="rounded-lg border border-purple-800 bg-purple-900/30 p-6">
        {data.videos.length === 0 ? (
          <p className="text-gray-400">
            Aucune vidéo publiée.
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {data.videos.map((video: any) => (
              <div
                key={video.id}
                className="bg-slate-800 rounded-lg overflow-hidden"
              >
                <img
                  src={video.thumbnailUrl || video.videoUrl}
                  alt={video.title}
                  className="w-full h-40 object-cover"
                />

                <div className="p-3">
                  <p className="font-bold text-white truncate">
                    {video.title}
                  </p>

                  <p className="text-sm text-gray-400">
                    👁 {video.views}
                  </p>

                  <p className="text-sm text-pink-400">
                    ❤️ {video.likes}
                  </p>

                  <button
                    onClick={() => {
                      if (confirm("Voulez-vous vraiment supprimer cette vidéo ?")) {
                        deleteVideo.mutate({
                          videoId: video.id,
                        });
                      }
                    }}
                    className="mt-3 w-full bg-red-600 hover:bg-red-500 text-white py-2 rounded"
                  >
                    🗑 Supprimer
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
