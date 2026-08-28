import { storagePut } from "../storage";

/**
 * Upload sécurisé des médias publicitaires.
 * Les fichiers sont isolés dans le dossier ads/ et retournent
 * une URL permanente utilisable par une campagne.
 */
export async function uploadAdvertisingMedia(params: {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  userId: number;
}) {
  const { buffer, originalName, mimeType, userId } = params;

  const isImage = mimeType.startsWith("image/");
  const isVideo = mimeType.startsWith("video/");

  if (!isImage && !isVideo) {
    throw new Error("Le média publicitaire doit être une image ou une vidéo.");
  }

  const maxSize = isVideo ? 100 * 1024 * 1024 : 15 * 1024 * 1024;
  if (buffer.length > maxSize) {
    throw new Error(
      isVideo
        ? "La vidéo publicitaire dépasse 100 Mo."
        : "La photo publicitaire dépasse 15 Mo."
    );
  }

  const safeName = originalName
    .replace(/[^a-zA-Z0-9._-]/g, "-")
    .slice(-120) || (isVideo ? "advertisement.mp4" : "advertisement.jpg");

  const fileKey = `ads/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}-${safeName}`;

  const { url } = await storagePut(fileKey, buffer, mimeType);
  return { url, mediaType: isVideo ? "video" : "image" };
}
