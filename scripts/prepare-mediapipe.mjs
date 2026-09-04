import { cpSync, existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const publicDir = join(root, "client", "public", "mediapipe");
const wasmSource = join(root, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = join(publicDir, "wasm");
const modelDest = join(publicDir, "face_landmarker.task");
const remoteModel = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

mkdirSync(publicDir, { recursive: true });
if (!existsSync(wasmSource)) throw new Error(`MediaPipe WASM introuvable: ${wasmSource}`);
cpSync(wasmSource, wasmDest, { recursive: true });

if (!existsSync(modelDest)) {
  const response = await fetch(remoteModel);
  if (!response.ok) throw new Error(`Téléchargement du modèle MediaPipe échoué: HTTP ${response.status}`);
  const buffer = Buffer.from(await response.arrayBuffer());
  writeFileSync(modelDest, buffer);
  console.log(`MediaPipe model téléchargé: ${buffer.length} bytes`);
} else {
  console.log("MediaPipe model déjà présent, téléchargement ignoré.");
}

console.log("MediaPipe local assets préparés.");
