import { spawn } from "node:child_process";
import { PREMIUM_HD_OPTIONS, type HdTranscodeOptions } from "./types";

export interface TranscodeRequest {
  inputPath: string;
  outputPath: string;
  options?: HdTranscodeOptions;
}

export function transcodeToHd(request: TranscodeRequest): Promise<void> {
  const options = request.options ?? PREMIUM_HD_OPTIONS;

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

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
      if (stderr.length > 12000) stderr = stderr.slice(-12000);
    });

    child.once("error", (error) => reject(new Error(`FFmpeg unavailable: ${error.message}`)));
    child.once("close", (code) => {
      if (code === 0) return resolve();
      reject(new Error(`FFmpeg exited with code ${code}: ${stderr.trim()}`));
    });
  });
}
