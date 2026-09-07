import type { NormalizedLandmark } from "@mediapipe/tasks-vision";
import type { AREffect } from "@/features/ar/ARRegistry";
import { applyBeautyPipeline } from "@/features/beauty/BeautyPipeline";
import { renderFaceEffect } from "@/features/beauty/FaceEffects";

export interface EffectPreviewFrame {
  video: HTMLVideoElement;
  landmarks: NormalizedLandmark[];
  width: number;
  height: number;
}

function drawCover(ctx: CanvasRenderingContext2D, video: HTMLVideoElement, width: number, height: number) {
  const scale = Math.max(width / video.videoWidth, height / video.videoHeight);
  const drawWidth = video.videoWidth * scale;
  const drawHeight = video.videoHeight * scale;
  const dx = (width - drawWidth) / 2;
  const dy = (height - drawHeight) / 2;
  ctx.drawImage(video, dx, dy, drawWidth, drawHeight);
}

export function renderEffectPreview(frame: EffectPreviewFrame, effect: AREffect): string | null {
  if (!frame.video.videoWidth || !frame.video.videoHeight || frame.landmarks.length === 0) return null;
  const canvas = document.createElement("canvas");
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) return null;

  ctx.save();
  drawCover(ctx, frame.video, frame.width, frame.height);
  ctx.restore();

  applyBeautyPipeline(ctx, frame.landmarks, frame.width, frame.height, effect.beautyConfig);
  renderFaceEffect(ctx, frame.landmarks, frame.width, frame.height, effect);
  return canvas.toDataURL("image/jpeg", 0.78);
}

export function renderEffectPreviews(frame: EffectPreviewFrame, effects: AREffect[]) {
  const previews: Record<string, string> = {};
  for (const effect of effects) {
    try {
      const preview = renderEffectPreview(frame, effect);
      if (preview) previews[effect.id] = preview;
    } catch (error) {
      console.error(`[EffectPreview] Failed to render ${effect.id}`, error);
    }
  }
  return previews;
}
