import { randomUUID } from "crypto";

export const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
export const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

function ascii(buffer: Buffer, start: number, length: number): string {
  return buffer.subarray(start, start + length).toString("ascii");
}

/**
 * Verify the bytes match the claimed media type. Client-provided MIME types
 * and extensions are not trusted because they can be forged.
 */
export function hasValidMediaSignature(buffer: Buffer, mimeType: string): boolean {
  if (!Buffer.isBuffer(buffer) || buffer.length < 4) return false;

  switch (mimeType) {
    case "image/jpeg":
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    case "image/png":
      return buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/gif":
      return ascii(buffer, 0, 6) === "GIF87a" || ascii(buffer, 0, 6) === "GIF89a";
    case "image/webp":
      return ascii(buffer, 0, 4) === "RIFF" && ascii(buffer, 8, 4) === "WEBP";
    case "video/mp4":
    case "video/quicktime":
      return buffer.length >= 12 && ascii(buffer, 4, 4) === "ftyp";
    case "video/webm":
      return buffer.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    default:
      return false;
  }
}

export function createStorageKey(folder: string, extension: string): string {
  const safeExtension = extension.toLowerCase().replace(/[^a-z0-9]/g, "").slice(0, 8);
  return `${folder}/${randomUUID()}${safeExtension ? `.${safeExtension}` : ""}`;
}
