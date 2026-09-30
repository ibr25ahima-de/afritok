import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useLocation } from "wouter";
import { useRef } from "react";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Item = ({ icon: Icon, path }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`flex min-h-11 min-w-11 flex-col items-center justify-center text-xs touch-manipulation ${
        location === path ? "text-white" : "text-gray-400"
      }`}
    >
      <Icon size={26} />
    </button>
  );

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Pour l’instant on redirige seulement
    // Après on connectera UploadContext
    navigate("/upload");
  };

  return (
    <>
      <div className="fixed inset-x-0 bottom-0 z-50 flex min-h-16 items-center justify-around border-t border-gray-800 bg-black px-1 pb-[max(0.5rem,var(--afritok-safe-bottom))] pt-2">
        <Item icon={Home} path="/feed" />
        <Item icon={Search} path="/discover" />

        {/* center upload */}
        <button
          onClick={handleUploadClick}
          className="flex min-h-11 min-w-11 items-center justify-center rounded-md bg-white px-3 text-black touch-manipulation"
        >
          <PlusSquare size={28} />
        </button>

        <Item icon={MessageCircle} path="/inbox" />
        <Item icon={User} path="/profile" />
      </div>

      {/* hidden file input */}
      <input
        type="file"
        accept="video/*"
        ref={fileInputRef}
        style={{ display: "none" }}
        onChange={handleVideoSelect}
      />
    </>
  );
}
