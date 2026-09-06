import type { NormalizedLandmark } from "@mediapipe/tasks-vision";

/** Engine-neutral description of the effect selected by the application. */
export interface AREffectDefinition {
  id: string;
  renderer: string;
  config?: Record<string, unknown>;
  assets?: {
    model?: string;
    textures?: string[];
    materials?: string[];
    shaders?: string[];
    animation?: string;
  };
}

export interface ARFaceFrame {
  landmarks: NormalizedLandmark[];
  timestamp: number;
  width: number;
  height: number;
  headRotation?: { roll: number; pitch: number; yaw: number };
}

export interface ARRenderContext {
  ctx: CanvasRenderingContext2D;
  video: HTMLVideoElement;
  frame: ARFaceFrame;
  effect: AREffectDefinition | null;
}

export interface ARTracker {
  initialize(): Promise<void>;
  detect(video: HTMLVideoElement, timestamp: number): ARFaceFrame | null;
  dispose(): void;
}

export interface ARRenderer {
  render(context: ARRenderContext): void;
}

/** Public contract between AfrItok's camera UI and the dedicated AR engine. */
export interface AREngine {
  initialize(): Promise<void>;
  renderFrame(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    effect: AREffectDefinition | null,
    timestamp: number,
  ): void;
  dispose(): void;
}
