import { Home, Search, PlusSquare, MessageCircle, User } from "lucide-react";
import { useLocation } from "wouter";
import { useRef } from "react";

export default function BottomNav() {
  const [location, navigate] = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const Item = ({ icon: Icon, path }: any) => (
    <button
      onClick={() => navigate(path)}
      className={`flex flex-col items-center text-xs ${
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
      <div className="fixed bottom-0 left-0 right-0 bg-black border-t border-gray-800 flex justify-around py-2 z-50">
        <Item icon={Home} path="/feed" />
        <Item icon={Search} path="/discover" />

        {/* center upload */}
        <button
          onClick={handleUploadClick}
          className="bg-white text-black px-3 rounded-md"
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
