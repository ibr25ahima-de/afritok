import { useEffect, useRef } from "react";

/**
 * The main montage screen must show the natural video preview first.
 * The real clip timeline is opened by the Modifier action through ClipEditorFixed.
 * This component remains as a compatibility mount point for the existing Upload layout.
 */
export function VideoTimeline() {
  const markerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const marker = markerRef.current;
    const host = marker?.parentElement;
    if (!host) return;

    const stage = host.previousElementSibling as HTMLElement | null;
    const previousHostDisplay = host.style.display;
    const previousStageBottom = stage?.style.bottom ?? "";

    // Remove the old timeline slot from the normal montage screen.
    // ClipEditorFixed provides the timeline only after the user taps Modifier.
    host.style.display = "none";
    if (stage) stage.style.bottom = "116px";

    return () => {
      host.style.display = previousHostDisplay;
      if (stage) stage.style.bottom = previousStageBottom;
    };
  }, []);

  return <div ref={markerRef} aria-hidden="true" className="hidden" />;
}
