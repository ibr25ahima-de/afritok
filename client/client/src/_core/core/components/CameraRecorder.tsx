/**
 * Composant CameraRecorder pour enregistrement vidéo direct
 * 
 * Fonctionnalités :
 * - Accès à la caméra
 * - Enregistrement vidéo
 * - Segments d'enregistrement
 * - Édition basique
 * - Upload vers R2
 */

import React, { useRef, useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Camera, StopCircle, Play, Pause, Download, Trash2 } from 'lucide-react';

/**
 * Interface pour les segments d'enregistrement
 */
interface RecordingSegment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
}

/**
 * Props du composant
 */
interface CameraRecorderProps {
  onVideoRecorded?: (blob: Blob, duration: number) => void;
  maxDuration?: number; // en secondes
  autoUpload?: boolean;
}

/**
 * Composant CameraRecorder
 */
export const CameraRecorder: React.FC<CameraRecorderProps> = ({
  onVideoRecorded,
  maxDuration = 300, // 5 minutes par défaut
  autoUpload = false,
}) => {
  // Références
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // États
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [segments, setSegments] = useState<RecordingSegment[]>([]);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording && !isPaused) {
      interval = setInterval(() => {
        setRecordingTime((prev) => {
          if (prev >= maxDuration) {
            stopRecording();
            return prev;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isRecording, isPaused, maxDuration]);

  /**
   * Initialiser la caméra
   */
  const initializeCamera = async () => {
    try {
      setIsLoading(true);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: true,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setError(null);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur d\'accès à la caméra';
      setError(message);
      console.error('Camera error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Arrêter la caméra
   */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setCameraActive(false);
    }
  };

  /**
   * Commencer l'enregistrement
   */
  const startRecording = async () => {
    if (!streamRef.current) {
      await initializeCamera();
      return;
    }

    try {
      const chunks: Blob[] = [];

      const mediaRecorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        setRecordedBlob(blob);
        if (onVideoRecorded) {
          onVideoRecorded(blob, recordingTime);
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      setSegments([]);
      setError(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur lors du démarrage de l\'enregistrement';
      setError(message);
      console.error('Recording error:', err);
    }
  };

  /**
   * Arrêter l'enregistrement
   */
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
    }
  };

  /**
   * Pause l'enregistrement
   */
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        mediaRecorderRef.current.resume();
        setIsPaused(false);
      } else {
        mediaRecorderRef.current.pause();
        setIsPaused(true);
      }
    }
  };

  /**
   * Ajouter un segment
   */
  const addSegment = () => {
    const segment: RecordingSegment = {
      id: `segment-${Date.now()}`,
      startTime: recordingTime,
      endTime: recordingTime,
      duration: 0,
    };
    setSegments([...segments, segment]);
  };

  /**
   * Télécharger la vidéo
   */
  const downloadVideo = () => {
    if (!recordedBlob) return;

    const url = URL.createObjectURL(recordedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `video-${Date.now()}.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  /**
   * Réinitialiser
   */
  const reset = () => {
    setRecordedBlob(null);
    setRecordingTime(0);
    setSegments([]);
    setError(null);
  };

  // Format du temps
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full max-w-2xl mx-auto p-6">
      <div className="space-y-4">
        {/* Titre */}
        <h2 className="text-2xl font-bold">Enregistrement vidéo</h2>

        {/* Erreur */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        {/* Vidéo */}
        <div className="relative bg-black rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-auto"
            style={{ aspectRatio: '16 / 9' }}
          />

          {/* Overlay de temps */}
          {isRecording && (
            <div className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full font-mono text-sm">
              {formatTime(recordingTime)}
            </div>
          )}
        </div>

        {/* Contrôles */}
        <div className="flex gap-2 flex-wrap">
          {!cameraActive ? (
            <Button
              onClick={initializeCamera}
              disabled={isLoading}
              className="gap-2"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
              Activer la caméra
            </Button>
          ) : (
            <>
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  variant="destructive"
                  className="gap-2"
                >
                  <Camera className="w-4 h-4" />
                  Commencer l'enregistrement
                </Button>
              ) : (
                <>
                  <Button
                    onClick={pauseRecording}
                    variant="secondary"
                    className="gap-2"
                  >
                    {isPaused ? (
                      <>
                        <Play className="w-4 h-4" />
                        Reprendre
                      </>
                    ) : (
                      <>
                        <Pause className="w-4 h-4" />
                        Pause
                      </>
                    )}
                  </Button>

                  <Button
                    onClick={stopRecording}
                    variant="destructive"
                    className="gap-2"
                  >
                    <StopCircle className="w-4 h-4" />
                    Arrêter
                  </Button>

                  <Button
                    onClick={addSegment}
                    variant="outline"
                    className="gap-2"
                  >
                    Ajouter un segment
                  </Button>
                </>
              )}

              <Button
                onClick={stopCamera}
                variant="outline"
                className="gap-2"
              >
                Fermer la caméra
              </Button>
            </>
          )}
        </div>

        {/* Vidéo enregistrée */}
        {recordedBlob && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Vidéo enregistrée</h3>

            <div className="bg-gray-100 rounded-lg p-4">
              <p className="text-sm text-gray-600">
                Durée : {formatTime(recordingTime)} | Taille : {(recordedBlob.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={downloadVideo}
                variant="outline"
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Télécharger
              </Button>

              <Button
                onClick={reset}
                variant="outline"
                className="gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Réinitialiser
              </Button>
            </div>
          </div>
        )}

        {/* Segments */}
        {segments.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Segments ({segments.length})</h3>
            <div className="space-y-1">
              {segments.map((segment) => (
                <div key={segment.id} className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                  {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default CameraRecorder;
