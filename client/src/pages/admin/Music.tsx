import React, { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Music as MusicIcon, RefreshCw, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

export default function Music() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [artist, setArtist] = useState("");
  const [syncResult, setSyncResult] = useState<{ addedCount: number } | null>(null);
  const utils = trpc.useContext();

  const uploadMutation = trpc.adminMusic.uploadAudioFile.useMutation({
    onSuccess: () => {
      setAudioFile(null);
      setArtist("");
      utils.music.getByTab.invalidate();
      utils.music.getTrending.invalidate();
    },
  });

  const syncMutation = trpc.adminMusic.syncMusicLibrary.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      utils.music.getByTab.invalidate();
      utils.music.getTrending.invalidate();
    },
  });

  const handleUpload = async () => {
    if (!audioFile) return;
    const fileBuffer = new Uint8Array(await audioFile.arrayBuffer());
    const acceptedTypes = ["audio/mpeg", "audio/mp4", "audio/aac", "audio/ogg", "audio/wav", "audio/x-wav", "audio/flac", "audio/webm"];
    const fileType = acceptedTypes.includes(audioFile.type) ? audioFile.type : "audio/mpeg";
    uploadMutation.mutate({
      fileBuffer,
      fileName: audioFile.name,
      fileType: fileType as any,
      artist: artist.trim() || "Artiste non renseigné",
    });
  };

  const handleSync = () => {
    setSyncResult(null);
    syncMutation.mutate();
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-white">Music Library</h1>
      <div className="bg-purple-900/30 border border-purple-800/50 rounded-lg p-6 space-y-6">
        <p className="text-purple-300">Manage audio tracks and library synchronization</p>

        <section className="rounded-lg border border-purple-800/50 bg-slate-900/60 p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><MusicIcon className="h-5 w-5" /> Ajouter une musique</h2>
          <p className="text-sm text-slate-300">Choisis un fichier audio depuis ton téléphone pour l’ajouter à la bibliothèque Afritok.</p>
          <input
            type="file"
            accept=".mp3,.m4a,.aac,.ogg,.wav,.flac,.webm,audio/*"
            onChange={(event) => setAudioFile(event.target.files?.[0] ?? null)}
            className="block w-full text-sm text-slate-300 file:mr-3 file:rounded file:border-0 file:bg-slate-700 file:px-3 file:py-2 file:text-white"
          />
          <input
            value={artist}
            onChange={(event) => setArtist(event.target.value)}
            placeholder="Nom de l’artiste (facultatif)"
            className="w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-white"
          />
          <button onClick={handleUpload} disabled={!audioFile || uploadMutation.isLoading} className="w-full rounded-lg bg-purple-600 px-5 py-3 font-semibold text-white disabled:opacity-50">
            {uploadMutation.isLoading ? <span className="inline-flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Ajout en cours...</span> : "Ajouter à la bibliothèque"}
          </button>
          {uploadMutation.isError && <p className="text-sm text-red-300">{uploadMutation.error.message}</p>}
          {uploadMutation.isSuccess && <p className="text-sm text-green-300">Musique ajoutée à la bibliothèque.</p>}
          <p className="text-xs text-slate-400">Formats acceptés : MP3, M4A, AAC, OGG, WAV, FLAC et WEBM. 30 Mo maximum.</p>
        </section>

        <section className="rounded-lg border border-purple-800/50 bg-slate-900/60 p-5 space-y-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-white"><RefreshCw className="h-5 w-5" /> Synchronisation automatique</h2>
          <p className="text-sm text-slate-300">Recherche les fichiers audio déjà présents dans le dossier <code className="rounded bg-slate-700 px-1 text-purple-200">music/</code> du stockage et les ajoute à la bibliothèque.</p>
          <button onClick={handleSync} disabled={syncMutation.isLoading} className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-6 py-3 font-bold text-white hover:bg-purple-500 disabled:opacity-50">
            {syncMutation.isLoading ? <><Loader2 className="h-5 w-5 animate-spin" /> Synchronisation en cours...</> : <><RefreshCw className="h-5 w-5" /> Synchroniser la bibliothèque</>}
          </button>
          {syncMutation.isError && <div className="flex items-start gap-3 rounded-lg border border-red-900/50 bg-red-900/20 p-4 text-red-200"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Erreur de synchronisation</p><p className="text-sm">{syncMutation.error.message}</p></div></div>}
          {syncResult && <div className="flex items-start gap-3 rounded-lg border border-green-900/50 bg-green-900/20 p-4 text-green-200"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" /><div><p className="font-semibold">Synchronisation terminée !</p><p className="text-sm">{syncResult.addedCount > 0 ? `${syncResult.addedCount} nouvelle(s) musique(s) ajoutée(s).` : "Aucun nouveau fichier audio trouvé dans le dossier music/."}</p></div></div>}
        </section>
      </div>
    </div>
  );
}
