import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import { ArrowLeft, Share2, Download } from "lucide-react";
import { useRef } from "react";

export default function QRCodePage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const qrRef = useRef<HTMLDivElement>(null);

  // Generate simple QR code URL using a public API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=https://afritok.com/profile/${user?.id}`;

  const handleDownload = async () => {
    try {
      const response = await fetch(qrCodeUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `afritok-profile-${user?.id}.png`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Erreur lors du téléchargement:', error);
    }
  };

  const handleShare = async () => {
    const shareData = {
      title: 'Mon profil Afritok',
      text: `Scannez mon code QR pour me suivre sur Afritok!`,
      url: `https://afritok.com/profile/${user?.id}`
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.error('Erreur lors du partage:', error);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`https://afritok.com/profile/${user?.id}`);
      alert('Lien copié dans le presse-papiers!');
    }
  };

  return (
    <div className="min-h-screen bg-black text-white pb-20">
      {/* HEADER */}
      <header className="sticky top-0 z-40 bg-black/80 backdrop-blur border-b border-gray-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => navigate("/profile/" + user?.id)}
          className="text-white hover:text-gray-300 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-lg font-bold flex-1">Ton code QR</h1>
      </header>

      {/* CONTENT */}
      <div className="px-4 py-6 space-y-6 flex flex-col items-center">
        {/* QR CODE */}
        <div
          ref={qrRef}
          className="bg-white p-4 rounded-lg"
        >
          <img
            src={qrCodeUrl}
            alt="QR Code"
            className="w-64 h-64"
          />
        </div>

        {/* PROFILE INFO */}
        <div className="text-center">
          <p className="text-gray-400 text-sm mb-2">Scannez ce code QR pour accéder à mon profil</p>
          <p className="text-white font-semibold">{user?.name || 'Mon profil'}</p>
          <p className="text-gray-400 text-sm">@{user?.email?.split('@')[0] || 'username'}</p>
        </div>

        {/* BUTTONS */}
        <div className="w-full space-y-3">
          <button
            onClick={handleShare}
            className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Share2 size={20} />
            Partager le code QR
          </button>

          <button
            onClick={handleDownload}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2"
          >
            <Download size={20} />
            Télécharger le code QR
          </button>
        </div>

        {/* INFO */}
        <div className="bg-gray-900/50 rounded-lg p-4 w-full text-center">
          <p className="text-gray-400 text-sm">
            💡 Partagez ce code QR pour que les autres puissent vous suivre facilement sur Afritok!
          </p>
        </div>
      </div>
    </div>
  );
}
