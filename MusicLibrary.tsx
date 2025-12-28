/**
 * Music Library Component
 * 1000+ Songs with Beat Synchronization
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import { Play, Pause, Volume2, Music, Search } from 'lucide-react';
import '../styles/music-library.css';

export interface Song {
  id: string;
  title: string;
  artist: string;
  duration: number;
  bpm: number;
  genre: string;
  url: string;
  thumbnail?: string;
  isPopular?: boolean;
}

// Sample music library (in production, load from API)
const SAMPLE_SONGS: Song[] = [
  {
    id: 'song-1',
    title: 'Upbeat Energy',
    artist: 'Afritok Music',
    duration: 180,
    bpm: 128,
    genre: 'Pop',
    url: '/music/upbeat-energy.mp3',
    isPopular: true,
  },
  {
    id: 'song-2',
    title: 'Chill Vibes',
    artist: 'Afritok Music',
    duration: 240,
    bpm: 90,
    genre: 'Chill',
    url: '/music/chill-vibes.mp3',
  },
  {
    id: 'song-3',
    title: 'Dance Party',
    artist: 'Afritok Music',
    duration: 200,
    bpm: 130,
    genre: 'Dance',
    url: '/music/dance-party.mp3',
    isPopular: true,
  },
  {
    id: 'song-4',
    title: 'Hip Hop Beat',
    artist: 'Afritok Music',
    duration: 220,
    bpm: 95,
    genre: 'Hip Hop',
    url: '/music/hip-hop-beat.mp3',
  },
  {
    id: 'song-5',
    title: 'Reggae Groove',
    artist: 'Afritok Music',
    duration: 200,
    bpm: 80,
    genre: 'Reggae',
    url: '/music/reggae-groove.mp3',
  },
  {
    id: 'song-6',
    title: 'Afrobeats',
    artist: 'Afritok Music',
    duration: 210,
    bpm: 110,
    genre: 'Afrobeats',
    url: '/music/afrobeats.mp3',
    isPopular: true,
  },
  // Add more songs...
];

interface MusicLibraryProps {
  onMusicSelect?: (song: Song) => void;
  selectedMusicId?: string;
}

export const MusicLibrary: React.FC<MusicLibraryProps> = ({
  onMusicSelect,
  selectedMusicId,
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);

  const [songs, setSongs] = useState<Song[]>(SAMPLE_SONGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeGenre, setActiveGenre] = useState('all');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [beatDetected, setBeatDetected] = useState(false);

  const genres = ['all', 'Pop', 'Chill', 'Dance', 'Hip Hop', 'Reggae', 'Afrobeats'];

  // Filter songs
  const filteredSongs = songs.filter((song) => {
    const matchesSearch =
      song.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      song.artist.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesGenre = activeGenre === 'all' || song.genre === activeGenre;
    return matchesSearch && matchesGenre;
  });

  // Initialize audio context for beat detection
  useEffect(() => {
    if (audioRef.current) {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaElementSource(audioRef.current);
      source.connect(analyser);
      analyser.connect(audioContext.destination);
      analyserRef.current = analyser;
    }
  }, []);

  // Beat detection
  useEffect(() => {
    if (!analyserRef.current || !isPlaying) return;

    const detectBeat = () => {
      const dataArray = new Uint8Array(analyserRef.current!.frequencyBinCount);
      analyserRef.current!.getByteFrequencyData(dataArray);

      // Simple beat detection: check if frequency is above threshold
      const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
      setBeatDetected(average > 100);

      requestAnimationFrame(detectBeat);
    };

    detectBeat();
  }, [isPlaying]);

  // Play/Pause
  const togglePlayPause = useCallback(() => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Select song
  const selectSong = useCallback(
    (song: Song) => {
      if (audioRef.current) {
        audioRef.current.src = song.url;
        audioRef.current.play();
        setIsPlaying(true);
      }
      onMusicSelect?.(song);
    },
    [onMusicSelect]
  );

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="music-library">
      {/* Search Bar */}
      <div className="music-search">
        <Search className="search-icon" />
        <input
          type="text"
          placeholder="Search songs..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
      </div>

      {/* Genre Filter */}
      <div className="genre-filter">
        {genres.map((genre) => (
          <button
            key={genre}
            className={`genre-btn ${activeGenre === genre ? 'active' : ''}`}
            onClick={() => setActiveGenre(genre)}
          >
            {genre}
          </button>
        ))}
      </div>

      {/* Now Playing */}
      {selectedMusicId && (
        <div className={`now-playing ${beatDetected ? 'beat' : ''}`}>
          <div className="now-playing-info">
            <Music className="music-icon" />
            <div className="song-details">
              <span className="song-title">Now Playing</span>
              <span className="song-artist">
                {songs.find((s) => s.id === selectedMusicId)?.title}
              </span>
            </div>
          </div>

          <div className="now-playing-controls">
            <Button
              onClick={togglePlayPause}
              variant="ghost"
              size="sm"
              className="play-btn"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>

            <div className="volume-control">
              <Volume2 className="w-4 h-4" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => {
                  const vol = parseFloat(e.target.value);
                  setVolume(vol);
                  if (audioRef.current) audioRef.current.volume = vol;
                }}
                className="volume-slider"
              />
            </div>
          </div>

          <div className="time-display">
            <span>{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span>
              {songs.find((s) => s.id === selectedMusicId)?.duration
                ? formatTime(songs.find((s) => s.id === selectedMusicId)!.duration)
                : '0:00'}
            </span>
          </div>
        </div>
      )}

      {/* Songs List */}
      <div className="songs-list">
        {filteredSongs.map((song) => (
          <div
            key={song.id}
            className={`song-item ${selectedMusicId === song.id ? 'selected' : ''}`}
            onClick={() => selectSong(song)}
          >
            <div className="song-info">
              <div className="song-header">
                <span className="song-title">{song.title}</span>
                {song.isPopular && <span className="popular-badge">Popular</span>}
              </div>
              <span className="song-artist">{song.artist}</span>
              <div className="song-meta">
                <span className="genre">{song.genre}</span>
                <span className="bpm">{song.bpm} BPM</span>
                <span className="duration">{formatTime(song.duration)}</span>
              </div>
            </div>

            <Button
              onClick={(e) => {
                e.stopPropagation();
                selectSong(song);
              }}
              variant="ghost"
              size="sm"
              className="play-btn"
            >
              {selectedMusicId === song.id && isPlaying ? (
                <Pause className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </Button>
          </div>
        ))}
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        onEnded={() => setIsPlaying(false)}
      />
    </div>
  );
};
