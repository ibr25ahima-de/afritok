/**
 * Video Editor Component
 * Professional video editing with multi-clip support
 * Similar to CapCut with advanced features
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Button } from './ui/button';
import { Slider } from './ui/slider';
import {
  Scissors,
  Copy,
  Trash2,
  Plus,
  Play,
  Pause,
  Volume2,
  Zap,
  Type,
  Sparkles,
} from 'lucide-react';
import '../styles/video-editor.css';

interface VideoClip {
  id: string;
  blob: Blob;
  duration: number;
  startTime: number;
  endTime: number;
  speed: number;
  volume: number;
  filters: string[];
  effects: string[];
}

interface VideoEditorProps {
  initialClips?: VideoClip[];
  onExport?: (blob: Blob) => void;
  onClose?: () => void;
}

export const VideoEditor: React.FC<VideoEditorProps> = ({
  initialClips = [],
  onExport,
  onClose,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [clips, setClips] = useState<VideoClip[]>(initialClips);
  const [selectedClipId, setSelectedClipId] = useState<string | null>(
    initialClips[0]?.id || null
  );
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(0);
  const [showTextEditor, setShowTextEditor] = useState(false);
  const [showEffectsPanel, setShowEffectsPanel] = useState(false);

  // Calculate total duration
  useEffect(() => {
    const total = clips.reduce((sum, clip) => sum + (clip.endTime - clip.startTime), 0);
    setTotalDuration(total);
  }, [clips]);

  // Get selected clip
  const selectedClip = clips.find((c) => c.id === selectedClipId);

  // Add clip
  const addClip = useCallback((blob: Blob, duration: number) => {
    const newClip: VideoClip = {
      id: `clip-${Date.now()}`,
      blob,
      duration,
      startTime: 0,
      endTime: duration,
      speed: 1,
      volume: 1,
      filters: [],
      effects: [],
    };
    setClips((prev) => [...prev, newClip]);
    setSelectedClipId(newClip.id);
  }, []);

  // Remove clip
  const removeClip = useCallback((id: string) => {
    setClips((prev) => prev.filter((c) => c.id !== id));
    if (selectedClipId === id) {
      setSelectedClipId(clips[0]?.id || null);
    }
  }, [clips, selectedClipId]);

  // Duplicate clip
  const duplicateClip = useCallback((id: string) => {
    const clip = clips.find((c) => c.id === id);
    if (!clip) return;

    const newClip: VideoClip = {
      ...clip,
      id: `clip-${Date.now()}`,
    };
    setClips((prev) => [...prev, newClip]);
  }, [clips]);

  // Update clip property
  const updateClip = useCallback(
    (id: string, updates: Partial<VideoClip>) => {
      setClips((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      );
    },
    []
  );

  // Trim clip
  const trimClip = useCallback(
    (id: string, startTime: number, endTime: number) => {
      updateClip(id, { startTime, endTime });
    },
    [updateClip]
  );

  // Add filter to clip
  const addFilter = useCallback(
    (filterId: string) => {
      if (!selectedClip) return;
      const newFilters = [...selectedClip.filters, filterId];
      updateClip(selectedClip.id, { filters: newFilters });
    },
    [selectedClip, updateClip]
  );

  // Remove filter from clip
  const removeFilter = useCallback(
    (filterId: string) => {
      if (!selectedClip) return;
      const newFilters = selectedClip.filters.filter((f) => f !== filterId);
      updateClip(selectedClip.id, { filters: newFilters });
    },
    [selectedClip, updateClip]
  );

  // Add effect to clip
  const addEffect = useCallback(
    (effectId: string) => {
      if (!selectedClip) return;
      const newEffects = [...selectedClip.effects, effectId];
      updateClip(selectedClip.id, { effects: newEffects });
    },
    [selectedClip, updateClip]
  );

  // Update speed
  const updateSpeed = useCallback(
    (speed: number) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, { speed });
    },
    [selectedClip, updateClip]
  );

  // Update volume
  const updateVolume = useCallback(
    (volume: number) => {
      if (!selectedClip) return;
      updateClip(selectedClip.id, { volume });
    },
    [selectedClip, updateClip]
  );

  // Play/Pause
  const togglePlayPause = useCallback(() => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  }, [isPlaying]);

  // Export video
  const exportVideo = useCallback(async () => {
    if (clips.length === 0) return;

    // Create a simple merged video blob
    // In production, use FFmpeg.js or a backend service for proper video encoding
    const mergedBlob = new Blob(clips.map((c) => c.blob), { type: 'video/webm' });
    onExport?.(mergedBlob);
  }, [clips, onExport]);

  // Format time
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-editor-container">
      {/* Main Preview */}
      <div className="editor-preview">
        <video
          ref={videoRef}
          className="preview-video"
          controls
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
        />

        {/* Timeline Info */}
        <div className="timeline-info">
          <span>{formatTime(currentTime)}</span>
          <span className="separator">/</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Timeline */}
      <div className="timeline-container">
        <div className="timeline-header">
          <h3>Timeline</h3>
          <Button onClick={() => addClip(new Blob(), 0)} variant="outline" size="sm">
            <Plus className="w-4 h-4" />
            Add Clip
          </Button>
        </div>

        <div className="timeline-clips">
          {clips.map((clip, index) => (
            <div
              key={clip.id}
              className={`timeline-clip ${selectedClipId === clip.id ? 'selected' : ''}`}
              onClick={() => setSelectedClipId(clip.id)}
              style={{
                width: `${((clip.endTime - clip.startTime) / totalDuration) * 100}%`,
              }}
            >
              <div className="clip-info">
                <span className="clip-number">Clip {index + 1}</span>
                <span className="clip-duration">{formatTime(clip.duration)}</span>
              </div>

              <div className="clip-actions">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    duplicateClip(clip.id);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <Copy className="w-3 h-3" />
                </Button>
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeClip(clip.id);
                  }}
                  variant="ghost"
                  size="sm"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Clip Editor Panel */}
      {selectedClip && (
        <div className="clip-editor-panel">
          <h3>Edit Clip</h3>

          {/* Trim Controls */}
          <div className="editor-section">
            <label>Trim</label>
            <div className="trim-controls">
              <input
                type="range"
                min="0"
                max={selectedClip.duration}
                value={selectedClip.startTime}
                onChange={(e) =>
                  trimClip(
                    selectedClip.id,
                    parseFloat(e.target.value),
                    selectedClip.endTime
                  )
                }
                className="trim-slider"
              />
              <span>{formatTime(selectedClip.startTime)}</span>
            </div>
            <div className="trim-controls">
              <input
                type="range"
                min="0"
                max={selectedClip.duration}
                value={selectedClip.endTime}
                onChange={(e) =>
                  trimClip(
                    selectedClip.id,
                    selectedClip.startTime,
                    parseFloat(e.target.value)
                  )
                }
                className="trim-slider"
              />
              <span>{formatTime(selectedClip.endTime)}</span>
            </div>
          </div>

          {/* Speed Control */}
          <div className="editor-section">
            <label>Speed: {selectedClip.speed.toFixed(1)}x</label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={selectedClip.speed}
              onChange={(e) => updateSpeed(parseFloat(e.target.value))}
              className="control-slider"
            />
          </div>

          {/* Volume Control */}
          <div className="editor-section">
            <label>
              <Volume2 className="w-4 h-4" />
              Volume: {Math.round(selectedClip.volume * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={selectedClip.volume}
              onChange={(e) => updateVolume(parseFloat(e.target.value))}
              className="control-slider"
            />
          </div>

          {/* Action Buttons */}
          <div className="editor-actions">
            <Button
              onClick={() => setShowEffectsPanel(!showEffectsPanel)}
              variant="outline"
              size="sm"
            >
              <Sparkles className="w-4 h-4" />
              Effects
            </Button>
            <Button
              onClick={() => setShowTextEditor(!showTextEditor)}
              variant="outline"
              size="sm"
            >
              <Type className="w-4 h-4" />
              Text
            </Button>
          </div>
        </div>
      )}

      {/* Bottom Controls */}
      <div className="editor-controls">
        <Button onClick={togglePlayPause} variant="default" size="lg">
          {isPlaying ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Play
            </>
          )}
        </Button>

        <Button onClick={exportVideo} variant="default" size="lg">
          <Zap className="w-5 h-5" />
          Export
        </Button>

        <Button onClick={onClose} variant="outline" size="lg">
          Close
        </Button>
      </div>

      {/* Hidden Canvas */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
    </div>
  );
};
