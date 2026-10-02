/**
 * Safari/iPhone camera compatibility.
 * Keeps Android behavior unchanged while normalizing the camera stream
 * and MediaRecorder format on iOS.
 */

const isIOS = () => {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent)
    || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
};

if (typeof window !== "undefined" && isIOS()) {
  const mediaDevices = navigator.mediaDevices;
  if (mediaDevices?.getUserMedia) {
    const originalGetUserMedia = mediaDevices.getUserMedia.bind(mediaDevices);

    mediaDevices.getUserMedia = async (constraints: MediaStreamConstraints) => {
      if (constraints.video && typeof constraints.video === "object" && !(constraints.video instanceof MediaStreamTrack)) {
        const video = { ...constraints.video } as MediaTrackConstraints;
        const width = video.width as ConstrainULong | undefined;
        const height = video.height as ConstrainULong | undefined;
        const widthIdeal = width && typeof width === "object" && "ideal" in width ? width.ideal : undefined;
        const heightIdeal = height && typeof height === "object" && "ideal" in height ? height.ideal : undefined;

        if (widthIdeal === 1280 && heightIdeal === 720) {
          video.width = { ideal: 720 };
          video.height = { ideal: 1280 };
          video.frameRate = { ideal: 30 };
          return originalGetUserMedia({ ...constraints, video });
        }
      }

      return originalGetUserMedia(constraints);
    };
  }

  const MediaRecorderCtor = window.MediaRecorder;
  if (MediaRecorderCtor?.isTypeSupported) {
    const originalIsTypeSupported = MediaRecorderCtor.isTypeSupported.bind(MediaRecorderCtor);
    MediaRecorderCtor.isTypeSupported = (type: string) => {
      if (type.startsWith("video/webm")) return false;
      return originalIsTypeSupported(type);
    };
  }
}

export {};
