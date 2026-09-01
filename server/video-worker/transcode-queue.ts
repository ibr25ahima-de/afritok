import { randomUUID } from "node:crypto";
import { transcodeToHd, type TranscodeRequest } from "./ffmpeg-transcoder";
import type { VideoTranscodeJob } from "./types";

const jobs = new Map<string, VideoTranscodeJob>();

export function createHdTranscodeJob(request: Omit<TranscodeRequest, "options"> & { videoId: number }): VideoTranscodeJob {
  const job: VideoTranscodeJob = {
    jobId: randomUUID(),
    videoId: request.videoId,
    sourceUrl: request.inputPath,
    outputPath: request.outputPath,
    status: "pending",
    createdAt: new Date().toISOString(),
  };
  jobs.set(job.jobId, job);
  void runHdTranscodeJob(job.jobId);
  return job;
}

export function getHdTranscodeJob(jobId: string): VideoTranscodeJob | null {
  return jobs.get(jobId) ?? null;
}

async function runHdTranscodeJob(jobId: string): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) return;

  job.status = "processing";
  try {
    await transcodeToHd({ inputPath: job.sourceUrl, outputPath: job.outputPath });
    job.status = "completed";
    job.completedAt = new Date().toISOString();
  } catch (error) {
    job.status = "failed";
    job.errorMessage = error instanceof Error ? error.message : "Unknown transcode error";
  }
}
