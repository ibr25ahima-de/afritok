/**
 * Video Auto-Save Hook
 * Automatically saves video drafts to local storage and cloud
 */

import React, { useEffect, useRef, useCallback } from 'react';

export interface VideoDraft {
  id: string;
  title: string;
  clips: Array<{
    id: string;
    blob: Blob;
    duration: number;
    startTime: number;
    endTime: number;
    speed: number;
    volume: number;
    filters: string[];
    effects: string[];
  }>;
  music?: {
    id: string;
    title: string;
    startTime: number;
  };
  thumbnail?: string;
  createdAt: number;
  updatedAt: number;
  status: 'draft' | 'processing' | 'published';
}

const STORAGE_KEY = 'afritok_video_drafts';
const AUTO_SAVE_INTERVAL = 30000; // 30 seconds
const MAX_DRAFTS = 50;
const MAX_STORAGE_SIZE = 100 * 1024 * 1024; // 100MB

/**
 * Auto-save video drafts to localStorage and cloud
 */
export const useVideoAutoSave = () => {
  const saveTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
  const pendingSaveRef = useRef<VideoDraft | null>(null);

  /**
   * Get all drafts from localStorage
   */
  const getDrafts = useCallback((): VideoDraft[] => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load drafts:', error);
      return [];
    }
  }, []);

  /**
   * Get current storage size
   */
  const getStorageSize = useCallback((): number => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      return stored ? new Blob([stored]).size : 0;
    } catch {
      return 0;
    }
  }, []);

  /**
   * Save draft to localStorage
   */
  const saveDraftLocal = useCallback(
    (draft: VideoDraft): boolean => {
      try {
        const drafts = getDrafts();
        const existingIndex = drafts.findIndex((d) => d.id === draft.id);

        if (existingIndex >= 0) {
          drafts[existingIndex] = draft;
        } else {
          drafts.push(draft);
        }

        // Keep only the latest MAX_DRAFTS
        if (drafts.length > MAX_DRAFTS) {
          drafts.sort((a, b) => b.updatedAt - a.updatedAt);
          drafts.splice(MAX_DRAFTS);
        }

        localStorage.setItem(STORAGE_KEY, JSON.stringify(drafts));
        return true;
      } catch (error) {
        console.error('Failed to save draft locally:', error);
        return false;
      }
    },
    [getDrafts]
  );

  /**
   * Save draft to cloud (S3)
   */
  const saveDraftCloud = useCallback(async (draft: VideoDraft): Promise<boolean> => {
    try {
      // In production, upload to S3 via API
      const response = await fetch('/api/videos/save-draft', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: draft.id,
          title: draft.title,
          thumbnail: draft.thumbnail,
          clipsCount: draft.clips.length,
          musicId: draft.music?.id,
          status: draft.status,
          updatedAt: draft.updatedAt,
        }),
      });

      return response.ok;
    } catch (error) {
      console.error('Failed to save draft to cloud:', error);
      return false;
    }
  }, []);

  /**
   * Auto-save draft with debouncing
   */
  const autoSaveDraft = useCallback(
    (draft: VideoDraft) => {
      // Clear existing timeout
      if (saveTimeoutRef.current !== undefined) {
        clearTimeout(saveTimeoutRef.current);
      }

      // Store pending save
      pendingSaveRef.current = draft;

      // Debounce: save after interval
      saveTimeoutRef.current = setTimeout(async () => {
        if (!pendingSaveRef.current) return;

        const currentDraft = pendingSaveRef.current;

        // Save locally first
        const localSuccess = saveDraftLocal(currentDraft);

        // Save to cloud if local save succeeded
        if (localSuccess) {
          await saveDraftCloud(currentDraft);
        }

        pendingSaveRef.current = null;
      }, AUTO_SAVE_INTERVAL);
    },
    [saveDraftLocal, saveDraftCloud]
  );

  /**
   * Delete draft
   */
  const deleteDraft = useCallback(
    (draftId: string): boolean => {
      try {
        const drafts = getDrafts();
        const filtered = drafts.filter((d) => d.id !== draftId);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
        return true;
      } catch (error) {
        console.error('Failed to delete draft:', error);
        return false;
      }
    },
    [getDrafts]
  );

  /**
   * Get draft by ID
   */
  const getDraft = useCallback(
    (draftId: string): VideoDraft | null => {
      const drafts = getDrafts();
      return drafts.find((d) => d.id === draftId) || null;
    },
    [getDrafts]
  );

  /**
   * Compress video for storage
   */
  const compressVideo = useCallback(async (blob: Blob): Promise<Blob> => {
    // In production, use FFmpeg.js for proper compression
    // For now, just return the blob
    return blob;
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== undefined) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    getDrafts,
    getDraft,
    autoSaveDraft,
    saveDraftLocal,
    saveDraftCloud,
    deleteDraft,
    compressVideo,
    getStorageSize,
    MAX_STORAGE_SIZE,
  };
};

/**
 * Optimize video rendering with requestAnimationFrame
 */
export const useVideoRender = (callback: () => void) => {
  const frameRef = useRef<number | undefined>(undefined);

  const startRender = useCallback(() => {
    const render = () => {
      callback();
      frameRef.current = requestAnimationFrame(render);
    };
    frameRef.current = requestAnimationFrame(render);
  }, [callback]);

  const stopRender = useCallback(() => {
    if (frameRef.current) {
      cancelAnimationFrame(frameRef.current);
    }
  }, []);

  useEffect(() => {
    return stopRender;
  }, [stopRender]);

  return { startRender, stopRender };
};

/**
 * Optimize memory usage with blob pooling
 */
export class BlobPool {
  private pool: Blob[] = [];
  private maxSize = 10;

  acquire(size: number): Blob {
    const blob = this.pool.pop();
    return blob || new Blob([], { type: 'video/webm' });
  }

  release(blob: Blob): void {
    if (this.pool.length < this.maxSize) {
      this.pool.push(blob);
    }
  }

  clear(): void {
    this.pool = [];
  }
}

/**
 * Optimize video export with streaming
 */
export const streamVideoExport = async (
  clips: any[],
  onProgress: (progress: number) => void
): Promise<Blob> => {
  const chunks: Uint8Array[] = [];
  const totalClips = clips.length;

  for (let i = 0; i < totalClips; i++) {
    const clip = clips[i];
    const arrayBuffer = await clip.blob.arrayBuffer();
    chunks.push(new Uint8Array(arrayBuffer));

    // Report progress
    onProgress(((i + 1) / totalClips) * 100);
  }

  // Combine chunks
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const combined = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }

  return new Blob([combined], { type: 'video/webm' });
};
