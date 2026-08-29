import { useLocation } from "wouter";
import AdvertisingCreateFormSecure from "@/components/advertising/AdvertisingCreateFormSecure";

export default function Advertising() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-black px-3 py-6 text-white">
      <div className="mx-auto mb-4 w-full max-w-lg">
        <button
          type="button"
          onClick={() => navigate("/feed")}
          className="rounded-xl px-3 py-2 text-sm font-bold text-gray-300 hover:bg-white/10"
        >
          ← Retour
        </button>
      </div>
      <AdvertisingCreateFormSecure />
    </div>
  );
}
