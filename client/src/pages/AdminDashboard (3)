import React, { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  Users,
  ShieldAlert,
  AlertTriangle,
  DollarSign,
  TrendingUp,
  Music,
  FileText,
  LayoutDashboard,
} from "lucide-react";
import { APP_LOGO, APP_TITLE } from "@/const";

import Dashboard from "./admin/Dashboard";
import UsersPage from "./admin/Users";
import Reports from "./admin/Reports";
import Warnings from "./admin/Warnings";
import Withdrawals from "./admin/Withdrawals";
import Finance from "./admin/Finance";
import MusicPage from "./admin/Music";
import Logs from "./admin/Logs";

type AdminSection = "home" | "dashboard" | "users" | "reports" | "warnings" | "withdrawals" | "finance" | "music" | "logs";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [activeSection, setActiveSection] = useState<AdminSection>("home");

  if (user?.role !== "admin") {
    navigate("/feed");
    return null;
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, color: "text-blue-400" },
    { id: "users", label: "Utilisateurs", icon: Users, color: "text-blue-400" },
    { id: "reports", label: "Signalements", icon: ShieldAlert, color: "text-red-400" },
    { id: "warnings", label: "Avertissements", icon: AlertTriangle, color: "text-yellow-400" },
    { id: "withdrawals", label: "Retraits", icon: DollarSign, color: "text-green-400" },
    { id: "finance", label: "Finance", icon: TrendingUp, color: "text-green-400" },
    { id: "music", label: "Musique", icon: Music, color: "text-purple-400" },
    { id: "logs", label: "Logs", icon: FileText, color: "text-slate-400" },
  ];

  const renderContent = () => {
    switch (activeSection) {
      case "dashboard": return <Dashboard />;
      case "users": return <UsersPage />;
      case "reports": return <Reports />;
      case "warnings": return <Warnings />;
      case "withdrawals": return <Withdrawals />;
      case "finance": return <Finance />;
      case "music": return <MusicPage />;
      case "logs": return <Logs />;
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id as AdminSection)}
                className="bg-purple-900/30 border border-purple-800/50 rounded-xl p-8 flex flex-col items-center gap-4 hover:bg-purple-800/40 transition-all transform hover:scale-[1.02] group"
              >
                <item.icon className={`w-12 h-12 ${item.color} group-hover:scale-110 transition-transform`} />
                <span className="text-xl font-bold text-white">{item.label}</span>
              </button>
            ))}
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 text-white">
      {/* Header */}
      <header className="border-b border-purple-800/30 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => activeSection === "home" ? navigate("/feed") : setActiveSection("home")}
              className="text-purple-400 hover:text-purple-300 flex items-center gap-2"
            >
              <ArrowLeft className="w-6 h-6" />
              {activeSection !== "home" && <span>Retour</span>}
            </button>
            <div className="flex items-center gap-2">
              {APP_LOGO && <img src={APP_LOGO} alt={APP_TITLE} className="h-8 w-8" />}
              <span className="text-xl font-bold text-white">{APP_TITLE} Admin</span>
            </div>
          </div>
          
          {activeSection !== "home" && (
            <div className="hidden md:flex items-center gap-2 overflow-x-auto max-w-md pb-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id as AdminSection)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    activeSection === item.id 
                      ? "bg-purple-600 text-white" 
                      : "bg-slate-800 text-purple-300 hover:bg-slate-700"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-12">
        {renderContent()}
      </main>
    </div>
  );
}
