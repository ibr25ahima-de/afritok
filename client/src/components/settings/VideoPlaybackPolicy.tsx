import { useEffect } from "react";
import { canAutoPlay, useAppRuntimeSettings } from "@/hooks/useAppRuntimeSettings";

export default function VideoPlaybackPolicy() {
  const { autoPlay, dataSaver } = useAppRuntimeSettings();

  useEffect(() => {
    const userPlaybackIntent = new WeakSet<HTMLVideoElement>();
    const intentTimers = new WeakMap<HTMLVideoElement, number>();

    const isFeedVideo = (target: EventTarget | null): target is HTMLVideoElement => {
      const video = target instanceof HTMLVideoElement ? target : null;
      if (!video || video.srcObject) return false;
      return window.location.pathname === "/feed" && Boolean(video.currentSrc || video.src);
    };

    const markUserIntent = (event: Event) => {
      const video = event.target instanceof HTMLVideoElement ? event.target : null;
      if (!video || !isFeedVideo(video)) return;
      userPlaybackIntent.add(video);
      const previousTimer = intentTimers.get(video);
      if (previousTimer) window.clearTimeout(previousTimer);
      intentTimers.set(video, window.setTimeout(() => userPlaybackIntent.delete(video), 1000));
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
      const video = event.target as HTMLVideoElement;
      const autoplayBlocked = autoPlay === "Jamais" || (autoPlay === "Wi-Fi uniquement" && !canAutoPlay(autoPlay));
      if (autoplayBlocked && !userPlaybackIntent.has(video)) video.pause();
      userPlaybackIntent.delete(video);
    };

    document.addEventListener("pointerdown", markUserIntent, true);
    document.addEventListener("keydown", markUserIntent, true);
    document.addEventListener("play", handlePlay, true);
    const observer = new MutationObserver(applyPreloadPolicy);
    observer.observe(document.body, { childList: true, subtree: true });
    applyPreloadPolicy();

    return () => {
      document.removeEventListener("pointerdown", markUserIntent, true);
      document.removeEventListener("keydown", markUserIntent, true);
      document.removeEventListener("play", handlePlay, true);
      observer.disconnect();
    };
  }, [autoPlay, dataSaver]);

  return null;
}
