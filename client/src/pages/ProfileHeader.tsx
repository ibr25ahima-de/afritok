import { ArrowLeft, MoreVertical, Flame, Flag, Lock } from "lucide-react";

interface ProfileHeaderProps {
  name: string;
  isOwnProfile: boolean;
  showMenu: boolean;
  setShowMenu: (show: boolean) => void;
  setShowMonetization: (show: boolean) => void;
  navigate: (path: string) => void;
}

export function ProfileHeader({
  name,
  isOwnProfile,
  showMenu,
  setShowMenu,
  setShowMonetization,
  navigate,
}: ProfileHeaderProps) {
  return (
    <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center justify-between">
      <button
        onClick={() => navigate("/feed")}
        className="text-white hover:text-gray-300 transition"
      >
        <ArrowLeft size={24} />
      </button>
      <h1 className="text-lg font-bold">{name}</h1>
      <button
        onClick={() => setShowMenu(!showMenu)}
        className="text-white hover:text-gray-300 transition relative"
      >
        <MoreVertical size={24} />
        {showMenu && (
          <div className="absolute right-0 top-full mt-2 bg-gray-900 rounded-lg shadow-lg z-50 w-48">
            {isOwnProfile && (
              <>
                <button
                  onClick={() => {
                    setShowMonetization(true);
                    setShowMenu(false);
                  }}
                  className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
                >
                  <Flame size={16} className="text-red-500" />
                  Monétisation
                </button>
                <button
                  onClick={() => {
                    setShowMenu(false);
                    navigate("/settings");
                  }}
                  className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700"
                >
                  Paramètres
                </button>
              </>
            )}
            <button
              onClick={() => {
                setShowMenu(false);
                alert("Fonction Signaler bientôt disponible");
              }}
              className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm border-b border-gray-700 flex items-center gap-2"
            >
              <Flag size={16} />
              Signaler
            </button>
            <button
              onClick={() => {
                setShowMenu(false);
                alert("Fonction Bloquer bientôt disponible");
              }}
              className="block w-full text-left px-4 py-3 hover:bg-gray-800 text-sm flex items-center gap-2"
            >
              <Lock size={16} />
              Bloquer
            </button>
          </div>
        )}
      </button>
    </header>
  );
}
