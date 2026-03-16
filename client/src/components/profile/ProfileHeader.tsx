import { useLocation } from "wouter";
import { ArrowLeft, Edit3, UserPlus, UserCheck, MoreVertical, Flame, Lock, Flag, MapPin } from "lucide-react";
import { useState } from "react";

interface ProfileHeaderProps {
  profile: any;
  isOwnProfile: boolean;
  isFollowing: boolean;
  showMenu: boolean;
  onMenuToggle: (show: boolean) => void;
  onFollowToggle: () => void;
}

export default function ProfileHeader({
  profile,
  isOwnProfile,
  isFollowing,
  showMenu,
  onMenuToggle,
  onFollowToggle,
}: ProfileHeaderProps) {
  const [, navigate] = useLocation();

  return (
    <>
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
        <button
          onClick={() => navigate("/feed")}
          className="text-white hover:text-gray-300 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold">{profile?.name || "Profil"}</h1>
        <button
          onClick={() => onMenuToggle(!showMenu)}
          className="text-white hover:text-gray-300 transition relative"
        >
          <MoreVertical size={24} />
          {showMenu && (
            <div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-48">
              {isOwnProfile && (
                <>
                  {/* Afritok Studio */}
                  <button
                    onClick={() => {
                      navigate("/afritok-studio");
                      onMenuToggle(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                  >
                    <Flame size={16} className="text-red-500" />
                    Afritok Studio
                  </button>

                  {/* Balance */}
                  <button
                    onClick={() => {
                      navigate("/balance");
                      onMenuToggle(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    💰 Solde
                  </button>

                  {/* QR Code */}
                  <button
                    onClick={() => {
                      navigate("/qr-code");
                      onMenuToggle(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    📱 Ton code QR
                  </button>

                  {/* Settings */}
                  <button
                    onClick={() => {
                      navigate("/settings");
                      onMenuToggle(false);
                    }}
                    className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                  >
                    Paramètres et confidentialité
                  </button>
                </>
              )}
              <button className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2">
                <Flag size={16} />
                Signaler
              </button>
              <button className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm flex items-center gap-2">
                <Lock size={16} />
                Bloquer
              </button>
            </div>
          )}
        </button>
      </header>

      {/* PROFILE HEADER */}
      <div className="px-4 py-6 border-b border-gray-800">
        {/* AVATAR & NAME */}
        <div className="flex items-start gap-4 mb-4">
          {profile?.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt={profile.name}
              className="w-20 h-20 rounded-full object-cover border-2 border-red-500"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-red-500 to-pink-500 flex items-center justify-center text-white text-2xl font-bold">
              {profile?.name?.[0]?.toUpperCase() || "U"}
            </div>
          )}

          <div className="flex-1">
            <h2 className="text-2xl font-bold text-white">{profile?.name || "Utilisateur"}</h2>
            <p className="text-gray-400 text-sm">@{profile?.email?.split("@")[0] || "username"}</p>
            {profile?.country && (
              <p className="text-gray-400 text-sm flex items-center gap-1 mt-1">
                <MapPin size={14} /> {profile.country}
              </p>
            )}
          </div>

          {/* ACTION BUTTONS */}
          <div className="flex gap-2">
            {isOwnProfile ? (
              <button
                onClick={() => navigate("/upload")}
                className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-full font-semibold transition"
              >
                <Edit3 size={18} />
              </button>
            ) : (
              <button
                onClick={onFollowToggle}
                className={`px-4 py-2 rounded-full font-semibold transition flex items-center gap-2 ${
                  isFollowing
                    ? "bg-gray-700 hover:bg-gray-600 text-white"
                    : "bg-red-500 hover:bg-red-600 text-white"
                }`}
              >
                {isFollowing ? (
                  <>
                    <UserCheck size={16} /> Following
                  </>
                ) : (
                  <>
                    <UserPlus size={16} /> Follow
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* BIO */}
        {profile?.bio && (
          <p className="text-gray-300 text-sm mb-4">{profile.bio}</p>
        )}
      </div>
    </>
  );
}
