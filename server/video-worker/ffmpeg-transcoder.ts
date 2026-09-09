import { spawn } from "node:child_process";
import { PREMIUM_HD_OPTIONS, type HdTranscodeOptions } from "./types";

export interface TranscodeRequest {
  inputPath: string;
  outputPath: string;
  options?: HdTranscodeOptions;
}

const FFMPEG_TIMEOUT_MS = 5 * 60 * 1000;
const MAX_DIMENSION = 3840;
const BITRATE_PATTERN = /^\d+(?:\.\d+)?[kKmMgG]$/;

function validateTranscodeRequest(request: TranscodeRequest, options: HdTranscodeOptions): void {
  if (!request.inputPath || request.inputPath.length > 4096 || !request.outputPath || request.outputPath.length > 4096) {
    throw new Error("Invalid FFmpeg file path.");
  }
  if (!Number.isSafeInteger(options.width) || !Number.isSafeInteger(options.height) || options.width < 1 || options.height < 1 || options.width > MAX_DIMENSION || options.height > MAX_DIMENSION) {
    throw new Error("Invalid FFmpeg dimensions.");
  }
  if (!BITRATE_PATTERN.test(options.videoBitrate) || !BITRATE_PATTERN.test(options.audioBitrate)) {
    throw new Error("Invalid FFmpeg bitrate.");
  }
}

export function transcodeToHd(request: TranscodeRequest): Promise<void> {
  const options = request.options ?? PREMIUM_HD_OPTIONS;
  validateTranscodeRequest(request, options);

  return new Promise((resolve, reject) => {
    const args = [
      "-y",
      "-i", request.inputPath,
      "-vf", `scale=w=${options.width}:h=${options.height}:force_original_aspect_ratio=decrease,pad=${options.width}:${options.height}:(ow-iw)/2:(oh-ih)/2`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-b:v", options.videoBitrate,
      "-c:a", "aac",
      "-b:a", options.audioBitrate,
      "-movflags", "+faststart",
      request.outputPath,
    ];

    const child = spawn("ffmpeg", args, { stdio: ["ignore", "ignore", "pipe"] });
    let stderr = "";
    let settled = false;
    const finish = (callback: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      callback();
    };
    const timeout = setTimeout(() => {
      child.kill("SIGKILL");
      finish(() => reject(new Error("FFmpeg processing timed out.")));
    }, FFMPEG_TIMEOUT_MS);

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });

    child.once("error", (error) => finish(() => reject(new Error(`FFmpeg unavailable: ${error.message}`))));
    child.once("close", (code) => {
      if (code === 0) return finish(resolve);
      finish(() => reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`)));
    });
  });
}
