export type VideoTranscodeStatus = "pending" | "processing" | "completed" | "failed";

export interface VideoTranscodeJob {
  jobId: string;
  videoId: number;
  sourceUrl: string;
  outputPath: string;
  status: VideoTranscodeStatus;
  errorMessage?: string;
  createdAt: string;
  completedAt?: string;
}

export interface HdTranscodeOptions {
  width: number;
  height: number;
  videoBitrate: string;
  audioBitrate: string;
}

export const PREMIUM_HD_OPTIONS: HdTranscodeOptions = {
  width: 1920,
  height: 1080,
  videoBitrate: "5M",
  audioBitrate: "128k",
};
