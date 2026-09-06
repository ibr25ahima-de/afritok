import type { AREffectDefinition, AREngine, ARRenderer, ARTracker } from "./types";

/**
 * Runtime coordinator for the dedicated client-side AR engine.
 *
 * The camera UI talks only to this class. Tracking and rendering are injected,
 * so the application does not need to know how MediaPipe, WebGL, shaders,
 * materials, meshes or effect assets are implemented.
 */
export class ARService implements AREngine {
  private initialized = false;

  constructor(
    private readonly tracker: ARTracker,
    private readonly renderer: ARRenderer,
  ) {}

  async initialize(): Promise<void> {
    if (this.initialized) return;
    await this.tracker.initialize();
    this.initialized = true;
  }

  renderFrame(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    effect: AREffectDefinition | null,
    timestamp: number,
  ): void {
    if (!this.initialized) return;

    const frame = this.tracker.detect(video, timestamp);
    if (!frame) return;

    this.renderer.render({ ctx, video, frame, effect });
  }

  dispose(): void {
    this.tracker.dispose();
    this.initialized = false;
  }
}
