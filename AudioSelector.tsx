import { useState, useRef } from "react";
import { Music, Play, Pause, Volume2, X } from "lucide-react";
import { POPULAR_SOUNDS, AudioPlayer } from "@/services/audioService";
import { Button } from "@/components/ui/button";

interface AudioSelectorProps {
  onSelectAudio?: (audioUrl: string, audioName: string) => void;
  onClose?: () => void;
}

export default function AudioSelector({ onSelectAudio, onClose }: AudioSelectorProps) {
  const [selectedAudio, setSelectedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredSounds = POPULAR_SOUNDS.filter(
    (sound) =>
      sound.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      sound.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePlayPreview = (sound: typeof POPULAR_SOUNDS[0]) => {
    // Arrêter la lecture précédente
    if (audioPlayerRef.current && isPlaying) {
      audioPlayerRef.current.stop();
      setIsPlaying(null);
    }

    // Jouer le nouvel audio
    audioPlayerRef.current = new AudioPlayer(sound.url);
    audioPlayerRef.current.setVolume(volume);
    audioPlayerRef.current.play();
    setIsPlaying(sound.id);

    // Arrêter quand c'est fini
    audioPlayerRef.current.onEnded(() => {
      setIsPlaying(null);
    });
  };

  const handleSelectAudio = (sound: typeof POPULAR_SOUNDS[0]) => {
    setSelectedAudio(sound.id);
    if (onSelectAudio) {
      onSelectAudio(sound.url, sound.name);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.setVolume(newVolume);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 border border-purple-800/50 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-purple-800/30 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Music className="w-6 h-6 text-purple-400" />
            <h2 className="text-2xl font-bold text-white">Sélectionner un son</h2>
          </div>
          <button
            onClick={onClose}
            className="text-purple-400 hover:text-purple-300 p-2 hover:bg-purple-900/30 rounded-lg transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Search */}
        <div className="border-b border-purple-800/30 p-4">
          <input
            type="text"
            placeholder="Rechercher des sons..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800 border border-purple-800/50 rounded-lg px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-purple-600"
          />
        </div>

        {/* Sounds List */}
        <div className="overflow-y-auto flex-1 p-4 space-y-3">
          {filteredSounds.length > 0 ? (
            filteredSounds.map((sound) => (
              <div
                key={sound.id}
                className={`p-4 rounded-lg border transition cursor-pointer ${
                  selectedAudio === sound.id
                    ? "bg-purple-900/60 border-purple-600"
                    : "bg-slate-800/30 border-purple-800/30 hover:bg-slate-800/50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="text-white font-semibold">{sound.name}</h3>
                    <div className="flex items-center gap-3 mt-2 text-sm">
                      <span className="text-purple-400 capitalize">
                        {sound.category}
                      </span>
                      <span className="text-purple-300">
                        {Math.round(sound.duration)}s
                      </span>
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <span
                            key={i}
                            className={`w-1 h-1 rounded-full ${
                              i < Math.round(sound.popularity / 20)
                                ? "bg-yellow-400"
                                : "bg-gray-600"
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlayPreview(sound);
                      }}
                      className="p-2 rounded-lg bg-purple-600 hover:bg-purple-700 text-white transition"
                    >
                      {isPlaying === sound.id ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Play className="w-5 h-5" />
                      )}
                    </button>

                    <Button
                      onClick={() => handleSelectAudio(sound)}
                      className={`${
                        selectedAudio === sound.id
                          ? "bg-green-600 hover:bg-green-700"
                          : "bg-purple-600 hover:bg-purple-700"
                      } text-white`}
                    >
                      {selectedAudio === sound.id ? "Sélectionné" : "Sélectionner"}
                    </Button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Music className="w-12 h-12 text-purple-400 mx-auto mb-3 opacity-50" />
              <p className="text-purple-300">Aucun son trouvé</p>
            </div>
          )}
        </div>

        {/* Volume Control */}
        {isPlaying && (
          <div className="border-t border-purple-800/30 p-4 bg-slate-800/30">
            <div className="flex items-center gap-3">
              <Volume2 className="w-5 h-5 text-purple-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="flex-1 h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
              <span className="text-purple-300 text-sm w-8 text-right">
                {Math.round(volume * 100)}%
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="border-t border-purple-800/30 p-4 flex gap-3">
          <Button
            onClick={onClose}
            variant="outline"
            className="flex-1 text-white border-purple-800 hover:bg-purple-900/30"
          >
            Annuler
          </Button>
          <Button
            onClick={() => {
              if (selectedAudio) {
                onClose?.();
              }
            }}
            disabled={!selectedAudio}
            className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white disabled:opacity-50"
          >
            Confirmer
          </Button>
        </div>
      </div>
    </div>
  );
}
