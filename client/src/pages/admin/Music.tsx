import React from "react";
import { useLocation } from "wouter";
import { Music as MusicIcon, RefreshCw } from "lucide-react";

export default function Music() {
  const [, navigate] = useLocation();

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Music Library</h1>
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6">
        <p className="text-purple-300 mb-6">Manage audio tracks and library synchronization</p>
        <button
          onClick={() => {/* Sync logic */}}
          className="flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-6 py-3 rounded-lg font-bold transition-all"
        >
          <RefreshCw className="w-5 h-5" />
          Synchroniser la bibliothèque
        </button>
      </div>
    </div>
  );
}
