import React from "react";

export default function UserDetails() {
  // Pour l'instant les vraies données seront branchées ensuite
  const stats = {
    videos: 0,
    comments: 0,
    likes: 0,
    favorites: 0,
    followers: 0,
    following: 0,
    earnings: 0,
    withdrawals: 0,
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">
        Détails de l'utilisateur
      </h1>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Vidéos</p>
          <p className="text-2xl font-bold text-white">{stats.videos}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Commentaires</p>
          <p className="text-2xl font-bold text-white">{stats.comments}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Likes</p>
          <p className="text-2xl font-bold text-white">{stats.likes}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Favoris</p>
          <p className="text-2xl font-bold text-white">{stats.favorites}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Abonnés</p>
          <p className="text-2xl font-bold text-white">{stats.followers}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Abonnements</p>
          <p className="text-2xl font-bold text-white">{stats.following}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Revenus</p>
          <p className="text-2xl font-bold text-green-400">{stats.earnings}</p>
        </div>

        <div className="bg-slate-800 rounded-lg p-4">
          <p className="text-gray-400">Retraits</p>
          <p className="text-2xl font-bold text-red-400">{stats.withdrawals}</p>
        </div>

      </div>
    </div>
  );
}
