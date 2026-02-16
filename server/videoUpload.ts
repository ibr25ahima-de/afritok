import { storagePut } from "./storage";
import { v4 as uuidv4 } from "uuid";

/**
 * Configuration vidéo
 */
export const VIDEO_CONFIG = {
  MAX_FILE_SIZE: 100 * 1024 * 1024, // 100 MB
  MAX_DURATION: 600, // 10 minutes
  THUMBNAIL_WIDTH: 320,
  THUMBNAIL_HEIGHT: 568,
};

/**
 * Interface métadonnées
 */
export interface VideoMetadata {
  filename: string;
  duration: number;
  size: number;
  mimeType: string;
  uploadedAt: Date;
}

/**
 * Validation vidéo
 */
  export function validateVideoFile(
  file: any
): { valid: boolean; error?: string } {

  if (!file) {
    return {
      valid: false,
      error: "Aucun fichier reçu.",
    };
  }

  if (file.size && file.size > VIDEO_CONFIG.MAX_FILE_SIZE) {
    return {
      valid: false,
      error: "Fichier trop volumineux. Taille maximale: 100 MB",
    };
  }

  return { valid: true };
  }
/**
 * Génère une miniature placeholder
 */
export async function generateVideoThumbnail(
  videoBuffer: Buffer,
  videoId: string
): Promise<string> {
  try {
    const placeholderImage = Buffer.from([
      0xff, 0xd8, 0xff, 0xd9,
    ]);

    const thumbnailKey = `videos/${videoId}/thumbnail.jpg`;

    const { url } = await storagePut(
      thumbnailKey,
      placeholderImage,
      "image/jpeg"
    );

    return url;
  } catch (error) {
    console.error("Thumbnail error:", error);
    return "";
  }
}

/**
 * Upload vidéo vers storage
 */
export async function uploadVideoToStorage(
  file: File,
  userId: number
): Promise<{ videoUrl: string; thumbnailUrl: string; size: number }> {

  const validation = validateVideoFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const videoId = uuidv4();
  const extension = file.name.split(".").pop() || "mp4";
  const videoKey = `videos/${userId}/${videoId}.${extension}`;

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { url: videoUrl } = await storagePut(
    videoKey,
    buffer,
    file.type
  );

  const thumbnailUrl = await generateVideoThumbnail(
    buffer,
    videoId
  );

  return {
    videoUrl,
    thumbnailUrl,
    size: file.size,
  };
}
