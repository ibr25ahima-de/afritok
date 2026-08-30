import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, User, Crown, Check } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState, useRef, useEffect } from "react";
import { trpc } from "@/lib/trpc";

const PREMIUM_THEMES = [
  { id: "gold", label: "Doré Premium", className: "from-amber-500/20 via-black to-black" },
  { id: "africa", label: "Afrique moderne", className: "from-emerald-500/20 via-black to-black" },
  { id: "night", label: "Sombre élégant", className: "from-violet-500/20 via-black to-black" },
] as const;

export default function EditProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const updateProfileMutation = trpc.user.updateProfile.useMutation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadAvatarMutation = trpc.user.uploadAvatar.useMutation();
  const { data: premium } = trpc.subscription.status.useQuery(undefined, { staleTime: 60_000 });

  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [theme, setTheme] = useState<string>(() => localStorage.getItem("afritok-premium-theme") || "gold");

  useEffect(() => {
    if (premium?.isPremium && PREMIUM_THEMES.some((item) => item.id === theme)) {
      localStorage.setItem("afritok-premium-theme", theme);
    }
  }, [premium?.isPremium, theme]);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSaveProfile = async () => {
    if (!name.trim()) {
      alert("Veuillez entrer votre nom et prénom");
      return;
    }
    setIsSaving(true);
    try {
      await updateProfileMutation.mutateAsync({ name, bio, country });
      alert("Profil mis à jour");
      navigate(`/profile/${user?.id}`);
    } catch {
      alert("Erreur lors de la mise à jour");
    } finally {
      setIsSaving(false);
    }
  };

  const selectedTheme = PREMIUM_THEMES.find((item) => item.id === theme) || PREMIUM_THEMES[0];

  return (
    <div className={`min-h-screen bg-gradient-to-br ${premium?.isPremium ? selectedTheme.className : "from-slate-900 via-purple-900 to-slate-900"}`}>
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button onClick={() => navigate(`/profile/${user?.id}`)} className="text-purple-400 hover:text-purple-300"><ArrowLeft className="w-6 h-6" /></button>
            <div className="flex items-center gap-2">{APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}<span className="text-xl font-bold text-white">{APP_TITLE}</span></div>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Modifier le profil</h1>

          {premium?.isPremium && (
            <section className="mb-8 rounded-2xl border border-amber-400/30 bg-black/30 p-5">
              <div className="flex items-center gap-2 mb-4"><Crown className="text-amber-400" size={20} /><h2 className="text-white font-bold">Personnalisation Premium</h2></div>
              <p className="text-gray-400 text-sm mb-4">Choisissez l’apparence Premium de votre profil.</p>
              <div className="grid gap-3 sm:grid-cols-3">
                {PREMIUM_THEMES.map((item) => (
                  <button key={item.id} type="button" onClick={() => setTheme(item.id)} className={`rounded-xl border p-3 text-left bg-gradient-to-br ${item.className} ${theme === item.id ? "border-amber-400" : "border-white/10"}`}>
                    <div className="h-12 rounded-lg bg-black/40 mb-2" />
                    <div className="flex items-center justify-between"><span className="text-xs font-bold text-white">{item.label}</span>{theme === item.id && <Check size={15} className="text-amber-400" />}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-3">Avatar</label>
            <div className="flex items-center gap-4"><div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center"><User className="w-10 h-10 text-white" /></div><><input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => { const file=e.target.files?.[0]; if(!file)return; try { const formData=new FormData(); formData.append("file",file); const response=await fetch("/api/upload-avatar",{method:"POST",body:formData}); const data=await response.json(); await uploadAvatarMutation.mutateAsync({avatarUrl:data.avatarUrl}); alert("Photo de profil mise à jour !"); } catch { alert("Erreur upload avatar"); } }} /><button onClick={()=>fileInputRef.current?.click()} className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">Changer l’avatar</button></></div>
          </div>

          <div className="mb-6"><label className="block text-purple-300 font-semibold mb-2">Nom</label><input type="text" value={name} onChange={(e)=>setName(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600" /></div>
          <div className="mb-6"><label className="block text-purple-300 font-semibold mb-2">Bio</label><textarea value={bio} onChange={(e)=>setBio(e.target.value)} placeholder="Parlez-nous de vous..." rows={4} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600" /></div>
          <div className="mb-6"><label className="block text-purple-300 font-semibold mb-2">Pays</label><input type="text" value={country} onChange={(e)=>setCountry(e.target.value)} placeholder="ex. Côte d’Ivoire, Nigeria, Ghana" className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600" /></div>
          <div className="mb-6"><label className="block text-purple-300 font-semibold mb-2">Devise</label><select value={currency} onChange={(e)=>setCurrency(e.target.value)} className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white"><option value="USD">USD ($)</option><option value="EUR">EUR (€)</option><option value="GBP">GBP (£)</option><option value="XOF">XOF (F CFA)</option><option value="NGN">NGN (₦)</option><option value="KES">KES (Ksh)</option><option value="GHS">GHS (₵)</option><option value="ZAR">ZAR (R)</option><option value="EGP">EGP (£)</option></select></div>
          <Button onClick={handleSaveProfile} disabled={isSaving} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold disabled:opacity-50">{isSaving ? "Enregistrement..." : "Enregistrer les modifications"}</Button>
        </div>
      </div>
    </div>
  );
}
