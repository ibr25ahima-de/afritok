export interface ProcessedRecordingResult {
  blob: Blob;
  duration: number;
}

function pickMimeType() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
  ];
  return types.find(type => MediaRecorder.isTypeSupported(type)) ?? "";
}

/** Records exactly what is rendered on the processed canvas, with microphone
 * audio mixed in. The camera's raw video track is never added to the recorder.
 */
export function createProcessedRecorder(
  canvas: HTMLCanvasElement,
  cameraStream: MediaStream,
  onComplete: (result: ProcessedRecordingResult) => void,
  onError: () => void,
) {
  if (!canvas.captureStream || typeof MediaRecorder === "undefined") {
    onError();
    return null;
  }

  const videoStream = canvas.captureStream(30);
  const tracks: MediaStreamTrack[] = [...videoStream.getVideoTracks()];
  let audioContext: AudioContext | null = null;
  let destination: MediaStreamAudioDestinationNode | null = null;

  try {
    audioContext = new AudioContext();
    destination = audioContext.createMediaStreamDestination();
    const microphone = audioContext.createMediaStreamSource(cameraStream);
    microphone.connect(destination);
    tracks.push(...destination.stream.getAudioTracks());
  } catch (error) {
    console.error("[ProcessedRecorder] audio", error);
    videoStream.getTracks().forEach(track => track.stop());
    onError();
    return null;
  }

  const mixedStream = new MediaStream(tracks);
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(mixedStream, mimeType ? { mimeType } : undefined);
  const chunks: Blob[] = [];
  const startedAt = performance.now();

  recorder.ondataavailable = event => {
    if (event.data.size > 0) chunks.push(event.data);
  };

  recorder.onerror = () => {
    audioContext?.close();
    mixedStream.getTracks().forEach(track => track.stop());
    onError();
  };

  recorder.onstop = () => {
    const blob = new Blob(chunks, { type: recorder.mimeType || "video/webm" });
    const duration = Math.max(0, Math.round((performance.now() - startedAt) / 1000));
    audioContext?.close();
    mixedStream.getTracks().forEach(track => track.stop());
    onComplete({ blob, duration });
  };

  audioContext.resume().catch(() => undefined);
  recorder.start(1000);

  return {
    recorder,
    stop: () => {
      if (recorder.state !== "inactive") recorder.stop();
    },
    cleanup: () => {
      mixedStream.getTracks().forEach(track => track.stop());
      audioContext?.close();
    },
  };
}
