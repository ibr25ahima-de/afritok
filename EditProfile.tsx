import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { ArrowLeft, User } from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState } from "react";

export default function EditProfile() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [name, setName] = useState(user?.name || "");
  const [bio, setBio] = useState("");
  const [country, setCountry] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);

  if (!isAuthenticated) {
    navigate("/");
    return null;
  }

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      // In a real app, you would call an API endpoint to update the profile
      // For now, we'll just show a success message
      alert("Profile updated successfully!");
      navigate(`/profile/${user?.id}`);
    } catch (error) {
      alert("Failed to update profile");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(`/profile/${user?.id}`)}
              className="text-purple-400 hover:text-purple-300"
            >
              <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Edit Form */}
      <div className="max-w-2xl mx-auto px-4 py-12">
        <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Edit Profile</h1>

          {/* Avatar */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-3">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center">
                <User className="w-10 h-10 text-white" />
              </div>
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg">
                Change Avatar
              </button>
            </div>
          </div>

          {/* Name */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Bio */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell us about yourself..."
              rows={4}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Country */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">Country</label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="e.g., Nigeria, Kenya, Ghana"
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
            />
          </div>

          {/* Currency */}
          <div className="mb-6">
            <label className="block text-purple-300 font-semibold mb-2">Currency</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-purple-600"
            >
              <option value="USD">USD ($)</option>
              <option value="EUR">EUR (€)</option>
              <option value="GBP">GBP (£)</option>
              <option value="NGN">NGN (₦)</option>
              <option value="KES">KES (Ksh)</option>
              <option value="GHS">GHS (₵)</option>
              <option value="ZAR">ZAR (R)</option>
              <option value="EGP">EGP (£)</option>
            </select>
          </div>

          {/* Save Button */}
          <Button
            onClick={handleSaveProfile}
            disabled={isSaving}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 font-semibold disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
