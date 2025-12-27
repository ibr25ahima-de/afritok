/**
 * Service de gestion audio pour Afritok
 * Gère la lecture, la synchronisation et les effets audio
 */

export interface AudioTrack {
  id: string;
  name: string;
  url: string;
  duration: number;
  category: "background" | "effect" | "music" | "voiceover";
  popularity: number;
}

/**
 * Bibliothèque de sons populaires
 */
export const POPULAR_SOUNDS: AudioTrack[] = [
  {
    id: "trending-1",
    name: "Afrobeat Vibes",
    url: "https://example.com/sounds/afrobeat.mp3",
    duration: 30,
    category: "music",
    popularity: 95,
  },
  {
    id: "trending-2",
    name: "Amapiano Beat",
    url: "https://example.com/sounds/amapiano.mp3",
    duration: 45,
    category: "music",
    popularity: 92,
  },
  {
    id: "trending-3",
    name: "Gqom Energy",
    url: "https://example.com/sounds/gqom.mp3",
    duration: 60,
    category: "music",
    popularity: 88,
  },
  {
    id: "effect-1",
    name: "Applause",
    url: "https://example.com/sounds/applause.mp3",
    duration: 3,
    category: "effect",
    popularity: 75,
  },
  {
    id: "effect-2",
    name: "Laugh Track",
    url: "https://example.com/sounds/laugh.mp3",
    duration: 4,
    category: "effect",
    popularity: 72,
  },
  {
    id: "bg-1",
    name: "Ambient Background",
    url: "https://example.com/sounds/ambient.mp3",
    duration: 120,
    category: "background",
    popularity: 68,
  },
];

/**
 * Classe pour gérer la lecture audio
 */
export class AudioPlayer {
  private audio: HTMLAudioElement;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private volume: number = 1;

  constructor(audioUrl: string) {
    this.audio = new Audio(audioUrl);
    this.audio.addEventListener("timeupdate", () => {
      this.currentTime = this.audio.currentTime;
    });
  }

  /**
   * Joue l'audio
   */
  play(): void {
    this.audio.play();
    this.isPlaying = true;
  }

  /**
   * Pause l'audio
   */
  pause(): void {
    this.audio.pause();
    this.isPlaying = false;
  }

  /**
   * Arrête l'audio et réinitialise
   */
  stop(): void {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.isPlaying = false;
    this.currentTime = 0;
  }

  /**
   * Définit le volume (0-1)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    this.audio.volume = this.volume;
  }

  /**
   * Obtient le volume actuel
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Définit le temps de lecture
   */
  setTime(time: number): void {
    this.audio.currentTime = time;
    this.currentTime = time;
  }

  /**
   * Obtient le temps actuel
   */
  getTime(): number {
    return this.currentTime;
  }

  /**
   * Obtient la durée totale
   */
  getDuration(): number {
    return this.audio.duration;
  }

  /**
   * Vérifie si l'audio est en lecture
   */
  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  /**
   * Ajoute un listener pour les changements
   */
  onTimeUpdate(callback: (time: number) => void): void {
    this.audio.addEventListener("timeupdate", () => {
      callback(this.audio.currentTime);
    });
  }

  /**
   * Ajoute un listener pour la fin
   */
  onEnded(callback: () => void): void {
    this.audio.addEventListener("ended", callback);
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.stop();
    this.audio.removeEventListener("timeupdate", () => {});
    this.audio.removeEventListener("ended", () => {});
  }
}

/**
 * Classe pour synchroniser audio et vidéo
 */
export class AudioVideoSync {
  private videoElement: HTMLVideoElement;
  private audioPlayer: AudioPlayer;
  private syncOffset: number = 0;

  constructor(videoElement: HTMLVideoElement, audioUrl: string) {
    this.videoElement = videoElement;
    this.audioPlayer = new AudioPlayer(audioUrl);
  }

  /**
   * Démarre la synchronisation
   */
  start(): void {
    this.videoElement.play();
    this.audioPlayer.play();

    // Synchroniser périodiquement
    const syncInterval = setInterval(() => {
      const videoDiff = Math.abs(
        this.videoElement.currentTime - this.audioPlayer.getTime()
      );

      // Si la différence est > 0.1s, resynchroniser
      if (videoDiff > 0.1) {
        this.audioPlayer.setTime(this.videoElement.currentTime + this.syncOffset);
      }
    }, 100);

    // Arrêter la synchronisation quand la vidéo se termine
    this.videoElement.addEventListener("ended", () => {
      clearInterval(syncInterval);
      this.audioPlayer.stop();
    });
  }

  /**
   * Pause la synchronisation
   */
  pause(): void {
    this.videoElement.pause();
    this.audioPlayer.pause();
  }

  /**
   * Définit le décalage entre audio et vidéo (en secondes)
   */
  setSyncOffset(offset: number): void {
    this.syncOffset = offset;
  }

  /**
   * Définit le volume de l'audio
   */
  setAudioVolume(volume: number): void {
    this.audioPlayer.setVolume(volume);
  }

  /**
   * Nettoie les ressources
   */
  destroy(): void {
    this.audioPlayer.destroy();
  }
}

/**
 * Extrait les informations d'un fichier audio
 */
export async function getAudioInfo(file: File): Promise<{
  duration: number;
  url: string;
}> {
  return new Promise((resolve, reject) => {
    const audio = new Audio();
    const url = URL.createObjectURL(file);

    audio.onloadedmetadata = () => {
      URL.revokeObjectURL(url);
      resolve({
        duration: audio.duration,
        url: URL.createObjectURL(file),
      });
    };

    audio.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Failed to load audio file"));
    };

    audio.src = url;
  });
}

/**
 * Mélange deux pistes audio (vidéo + audio externe)
 */
export async function mixAudio(
  videoUrl: string,
  audioUrl: string,
  audioVolume: number = 0.5
): Promise<string> {
  // Note: Le vrai mixage audio nécessite Web Audio API ou FFmpeg
  // Cette fonction retourne simplement les URLs pour le moment
  // En production, utilisez une libraire comme Tone.js ou FFmpeg.js

  return videoUrl; // Placeholder
}
