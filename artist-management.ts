/**
 * Artist Management - Gestion des artistes et du catalogue de musiques
 * 
 * Gère :
 * - Profils d'artistes
 * - Catalogue de musiques/sons
 * - Métadonnées des musiques
 * - Popularité et statistiques
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour un profil d'artiste
 */
export interface Artist {
  id: number;
  name: string;
  bio?: string;
  profileImage?: string;
  genre: string[];
  followers: number;
  totalStreams: number;
  totalEarnings: number; // en cents
  verified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour une musique/son
 */
export interface Music {
  id: string;
  artistId: number;
  title: string;
  description?: string;
  genre: string;
  duration: number; // en secondes
  audioUrl: string;
  coverImage?: string;
  streams: number;
  usageCount: number; // nombre de challenges utilisant cette musique
  isExplicit: boolean;
  status: 'draft' | 'published' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Interface pour une utilisation de musique
 */
export interface MusicUsage {
  id: string;
  musicId: string;
  artistId: number;
  creatorId: number;
  challengeId?: string;
  videoId?: string;
  usageType: 'challenge' | 'video' | 'duet' | 'remix';
  views: number;
  earnings: number; // en cents - revenu généré par cette utilisation
  timestamp: Date;
}

/**
 * Classe pour gérer les artistes et les musiques
 */
export class ArtistManagementManager {
  private artists: Map<number, Artist> = new Map();
  private musics: Map<string, Music> = new Map();
  private usages: Map<string, MusicUsage> = new Map();
  private artistMusics: Map<number, string[]> = new Map(); // artistId -> musicIds
  private musicUsages: Map<string, string[]> = new Map(); // musicId -> usageIds
  private creatorUsages: Map<number, string[]> = new Map(); // creatorId -> usageIds

  /**
   * Créer un profil d'artiste
   */
  createArtist(
    id: number,
    name: string,
    genre: string[],
    bio?: string,
    profileImage?: string
  ): Artist {
    const artist: Artist = {
      id,
      name,
      bio,
      profileImage,
      genre,
      followers: 0,
      totalStreams: 0,
      totalEarnings: 0,
      verified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.artists.set(id, artist);
    this.artistMusics.set(id, []);

    logger.info('Artist created', {
      artistId: id,
      name,
      genre: genre.join(', '),
    });

    return artist;
  }

  /**
   * Obtenir un artiste
   */
  getArtist(artistId: number): Artist | undefined {
    return this.artists.get(artistId);
  }

  /**
   * Vérifier un artiste
   */
  verifyArtist(artistId: number): boolean {
    const artist = this.artists.get(artistId);
    if (!artist) {
      logger.warn('Artist not found', { artistId });
      return false;
    }

    artist.verified = true;
    artist.updatedAt = new Date();

    logger.info('Artist verified', { artistId, name: artist.name });

    return true;
  }

  /**
   * Ajouter un follower à un artiste
   */
  addFollower(artistId: number): boolean {
    const artist = this.artists.get(artistId);
    if (!artist) {
      logger.warn('Artist not found', { artistId });
      return false;
    }

    artist.followers += 1;
    artist.updatedAt = new Date();

    return true;
  }

  /**
   * Publier une musique
   */
  publishMusic(
    artistId: number,
    title: string,
    genre: string,
    duration: number,
    audioUrl: string,
    description?: string,
    coverImage?: string,
    isExplicit: boolean = false
  ): Music | null {
    const artist = this.artists.get(artistId);
    if (!artist) {
      logger.warn('Artist not found', { artistId });
      return null;
    }

    const musicId = `music_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const music: Music = {
      id: musicId,
      artistId,
      title,
      description,
      genre,
      duration,
      audioUrl,
      coverImage,
      streams: 0,
      usageCount: 0,
      isExplicit,
      status: 'published',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.musics.set(musicId, music);
    this.artistMusics.get(artistId)!.push(musicId);
    this.musicUsages.set(musicId, []);

    logger.info('Music published', {
      musicId,
      artistId,
      title,
      genre,
    });

    return music;
  }

  /**
   * Obtenir une musique
   */
  getMusic(musicId: string): Music | undefined {
    return this.musics.get(musicId);
  }

  /**
   * Obtenir les musiques d'un artiste
   */
  getArtistMusics(artistId: number): Music[] {
    const musicIds = this.artistMusics.get(artistId) || [];
    return musicIds
      .map((id) => this.musics.get(id))
      .filter((m) => m !== undefined) as Music[];
  }

  /**
   * Enregistrer une utilisation de musique
   */
  recordMusicUsage(
    musicId: string,
    creatorId: number,
    usageType: 'challenge' | 'video' | 'duet' | 'remix',
    challengeId?: string,
    videoId?: string
  ): MusicUsage | null {
    const music = this.musics.get(musicId);
    if (!music) {
      logger.warn('Music not found', { musicId });
      return null;
    }

    const artist = this.artists.get(music.artistId);
    if (!artist) {
      logger.warn('Artist not found', { artistId: music.artistId });
      return null;
    }

    const usageId = `usage_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const usage: MusicUsage = {
      id: usageId,
      musicId,
      artistId: music.artistId,
      creatorId,
      challengeId,
      videoId,
      usageType,
      views: 0,
      earnings: 0,
      timestamp: new Date(),
    };

    this.usages.set(usageId, usage);
    this.musicUsages.get(musicId)!.push(usageId);

    if (!this.creatorUsages.has(creatorId)) {
      this.creatorUsages.set(creatorId, []);
    }
    this.creatorUsages.get(creatorId)!.push(usageId);

    // Incrémenter le compteur d'utilisation
    music.usageCount += 1;
    music.updatedAt = new Date();

    logger.info('Music usage recorded', {
      usageId,
      musicId,
      creatorId,
      usageType,
    });

    return usage;
  }

  /**
   * Obtenir une utilisation de musique
   */
  getMusicUsage(usageId: string): MusicUsage | undefined {
    return this.usages.get(usageId);
  }

  /**
   * Obtenir les utilisations d'une musique
   */
  getMusicUsages(musicId: string): MusicUsage[] {
    const usageIds = this.musicUsages.get(musicId) || [];
    return usageIds
      .map((id) => this.usages.get(id))
      .filter((u) => u !== undefined) as MusicUsage[];
  }

  /**
   * Obtenir les utilisations d'un créateur
   */
  getCreatorMusicUsages(creatorId: number): MusicUsage[] {
    const usageIds = this.creatorUsages.get(creatorId) || [];
    return usageIds
      .map((id) => this.usages.get(id))
      .filter((u) => u !== undefined) as MusicUsage[];
  }

  /**
   * Enregistrer les vues et les revenus pour une utilisation
   */
  recordMusicViews(usageId: string, views: number, revenuePerView: number = 0.001): boolean {
    const usage = this.usages.get(usageId);
    if (!usage) {
      logger.warn('Usage not found', { usageId });
      return false;
    }

    usage.views += views;
    usage.earnings += Math.floor(views * revenuePerView * 100); // Convertir en cents

    // Mettre à jour les statistiques de la musique
    const music = this.musics.get(usage.musicId);
    if (music) {
      music.streams += views;
      music.updatedAt = new Date();
    }

    // Mettre à jour les statistiques de l'artiste
    const artist = this.artists.get(usage.artistId);
    if (artist) {
      artist.totalStreams += views;
    }

    logger.info('Music views recorded', {
      usageId,
      views,
      earnings: usage.earnings,
    });

    return true;
  }

  /**
   * Obtenir les musiques populaires
   */
  getPopularMusics(limit: number = 10): Music[] {
    return Array.from(this.musics.values())
      .filter((m) => m.status === 'published')
      .sort((a, b) => b.streams - a.streams)
      .slice(0, limit);
  }

  /**
   * Obtenir les musiques par genre
   */
  getMusicsByGenre(genre: string, limit: number = 20): Music[] {
    return Array.from(this.musics.values())
      .filter((m) => m.genre === genre && m.status === 'published')
      .sort((a, b) => b.streams - a.streams)
      .slice(0, limit);
  }

  /**
   * Obtenir les artistes populaires
   */
  getPopularArtists(limit: number = 10): Artist[] {
    return Array.from(this.artists.values())
      .sort((a, b) => b.followers - a.followers)
      .slice(0, limit);
  }

  /**
   * Obtenir les statistiques d'un artiste
   */
  getArtistStats(artistId: number): {
    totalMusics: number;
    totalStreams: number;
    totalEarnings: number;
    followers: number;
    verified: boolean;
  } | null {
    const artist = this.artists.get(artistId);
    if (!artist) {
      return null;
    }

    const musics = this.getArtistMusics(artistId);
    const totalStreams = musics.reduce((sum, m) => sum + m.streams, 0);

    return {
      totalMusics: musics.length,
      totalStreams,
      totalEarnings: artist.totalEarnings,
      followers: artist.followers,
      verified: artist.verified,
    };
  }

  /**
   * Obtenir les statistiques globales
   */
  getGlobalStats(): {
    totalArtists: number;
    totalMusics: number;
    totalUsages: number;
    totalStreams: number;
  } {
    let totalStreams = 0;

    this.musics.forEach((music) => {
      totalStreams += music.streams;
    });

    return {
      totalArtists: this.artists.size,
      totalMusics: this.musics.size,
      totalUsages: this.usages.size,
      totalStreams,
    };
  }
}

// Singleton instance
let artistManager: ArtistManagementManager | null = null;

export function getArtistManagementManager(): ArtistManagementManager {
  if (!artistManager) {
    artistManager = new ArtistManagementManager();
  }
  return artistManager;
}
