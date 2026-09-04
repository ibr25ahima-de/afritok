import { useEffect } from "react";
import { canAutoPlay, useAppRuntimeSettings } from "@/hooks/useAppRuntimeSettings";

export default function VideoPlaybackPolicy() {
  const { autoPlay, dataSaver } = useAppRuntimeSettings();

  useEffect(() => {
    const isFeedVideo = (target: EventTarget | null): target is HTMLVideoElement => {
      const video = target instanceof HTMLVideoElement ? target : null;
      if (!video || video.srcObject) return false;
      return window.location.pathname === "/feed" && Boolean(video.currentSrc || video.src);
    };

    const applyPreloadPolicy = () => {
      if (window.location.pathname !== "/feed") return;
      document.querySelectorAll<HTMLVideoElement>("video").forEach(video => {
        if (video.srcObject) return;
        video.preload = dataSaver ? "metadata" : "auto";
      });
    };

    const handlePlay = (event: Event) => {
      if (!isFeedVideo(event.target)) return;
      if (autoPlay === "Jamais" || (autoPlay === "Wi-Fi uniquement" && !canAutoPlay(autoPlay))) {
        const video = event.target as HTMLVideoElement;
        video.pause();
      }
    };

    document.addEventListener("play", handlePlay, true);
    const observer = new MutationObserver(applyPreloadPolicy);
    observer.observe(document.body, { childList: true, subtree: true });
    applyPreloadPolicy();

    return () => {
      document.removeEventListener("play", handlePlay, true);
      observer.disconnect();
    };
  }, [autoPlay, dataSaver]);

  return null;
}
