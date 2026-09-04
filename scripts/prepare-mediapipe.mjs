import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));
const repo = join(root, "..");
const publicDir = join(repo, "client", "public", "mediapipe");
const wasmSource = join(repo, "node_modules", "@mediapipe", "tasks-vision", "wasm");
const wasmDest = join(publicDir, "wasm");
const modelDest = join(publicDir, "face_landmarker.task");
const enginePath = join(repo, "client", "src", "components", "AREngineMobile.tsx");
const remoteWasm = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm";
const remoteModel = "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";
const localWasm = "/mediapipe/wasm";
const localModel = "/mediapipe/face_landmarker.task";

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

if (existsSync(enginePath)) {
  const original = readFileSync(enginePath, "utf8");
  const patched = original.replace(remoteWasm, localWasm).replace(remoteModel, localModel);
  if (patched !== original) {
    writeFileSync(enginePath, patched);
    console.log("AREngineMobile: URLs MediaPipe remplacées par les assets locaux.");
  } else {
    console.log("AREngineMobile: URLs MediaPipe locales déjà configurées ou introuvables.");
  }
}

console.log("MediaPipe local assets préparés.");
