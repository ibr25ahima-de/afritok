/**
 * Video Camera Component
 * Handles video recording, photo capture, and live preview
 * Cross-platform compatible (Web, iOS, Android)
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Camera, Video, Square, RotateCcw, Check } from 'lucide-react';
import '../styles/video-camera.css';

interface VideoCameraProps {
  onVideoCapture?: (blob: Blob, duration: number) => void;
  onPhotoCapture?: (blob: Blob) => void;
  maxDuration?: number; // in seconds
  resolution?: '720p' | '1080p' | '4k';
  onClose?: () => void;
}

export const VideoCamera: React.FC<VideoCameraProps> = ({
  onVideoCapture,
  onPhotoCapture,
  maxDuration = 60,
  resolution = '1080p',
  onClose,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [cameraActive, setCameraActive] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [error, setError] = useState<string | null>(null);

  // Resolution settings
  const resolutionSettings = {
    '720p': { width: 1280, height: 720 },
    '1080p': { width: 1920, height: 1080 },
    '4k': { width: 3840, height: 2160 },
  };

  // Initialize camera
  useEffect(() => {
    const initCamera = async () => {
      try {
        const constraints = {
          video: {
            facingMode,
            ...resolutionSettings[resolution],
          },
          audio: true,
        };

        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          setError(null);
        }
      } catch (err) {
        setError('Unable to access camera. Please check permissions.');
        console.error('Camera error:', err);
      }
    };

    initCamera();

    return () => {
      if (videoRef.current?.srcObject) {
        const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
        tracks.forEach((track) => track.stop());
      }
    };
  }, [facingMode, resolution]);

  // Recording timer
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isRecording) {
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
  }, [isRecording, maxDuration]);

  // Start recording
  const startRecording = useCallback(async () => {
    if (!videoRef.current?.srcObject) return;

    chunksRef.current = [];
    const stream = videoRef.current.srcObject as MediaStream;

    try {
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'video/webm;codecs=vp9',
      });

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        onVideoCapture?.(blob, recordingTime);
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (err) {
      setError('Failed to start recording');
      console.error('Recording error:', err);
    }
  }, [onVideoCapture, recordingTime]);

  // Stop recording
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, [isRecording]);

  // Capture photo
  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const context = canvasRef.current.getContext('2d');
    if (!context) return;

    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;

    context.drawImage(videoRef.current, 0, 0);
    canvasRef.current.toBlob((blob) => {
      if (blob) {
        onPhotoCapture?.(blob);
      }
    }, 'image/jpeg', 0.95);
  }, [onPhotoCapture]);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'user' ? 'environment' : 'user'));
  }, []);

  // Format time display
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="video-camera-container">
      {error && (
        <div className="camera-error">
          <p>{error}</p>
          <Button onClick={onClose} variant="outline">
            Close
          </Button>
        </div>
      )}

      {!error && (
        <>
          {/* Video Preview */}
          <div className="camera-preview">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="camera-video"
            />

            {/* Recording Indicator */}
            {isRecording && (
              <div className="recording-indicator">
                <div className="recording-dot"></div>
                <span>{formatTime(recordingTime)}</span>
              </div>
            )}

            {/* Max Duration Warning */}
            {recordingTime >= maxDuration - 5 && isRecording && (
              <div className="duration-warning">
                Time limit approaching: {formatTime(maxDuration - recordingTime)}
              </div>
            )}
          </div>

          {/* Hidden Canvas for Photo Capture */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />

          {/* Controls */}
          <div className="camera-controls">
            <div className="control-group">
              {/* Record Button */}
              <Button
                onClick={isRecording ? stopRecording : startRecording}
                className={`record-button ${isRecording ? 'recording' : ''}`}
                size="lg"
              >
                {isRecording ? (
                  <>
                    <Square className="w-6 h-6" />
                    Stop
                  </>
                ) : (
                  <>
                    <Video className="w-6 h-6" />
                    Record
                  </>
                )}
              </Button>

              {/* Photo Button */}
              <Button
                onClick={capturePhoto}
                disabled={isRecording}
                variant="outline"
                size="lg"
              >
                <Camera className="w-6 h-6" />
                Photo
              </Button>
            </div>

            <div className="control-group">
              {/* Toggle Camera */}
              <Button
                onClick={toggleCamera}
                disabled={isRecording}
                variant="outline"
                size="lg"
              >
                <RotateCcw className="w-6 h-6" />
                Flip
              </Button>

              {/* Close Button */}
              <Button
                onClick={onClose}
                disabled={isRecording}
                variant="outline"
                size="lg"
              >
                <Check className="w-6 h-6" />
                Done
              </Button>
            </div>
          </div>

          {/* Timer Display */}
          <div className="timer-display">
            <span>{formatTime(recordingTime)}</span>
            <span className="max-duration">/ {formatTime(maxDuration)}</span>
          </div>
        </>
      )}
    </div>
  );
};
