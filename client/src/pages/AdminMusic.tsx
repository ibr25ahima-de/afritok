import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Loader2, Music, RefreshCw, CheckCircle2, AlertCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function AdminMusic() {
  const [syncResult, setSyncResult] = useState<{ addedCount: number } | null>(null);
  const utils = trpc.useContext();

  const syncMutation = trpc.adminMusic.syncMusicLibrary.useMutation({
    onSuccess: (data) => {
      setSyncResult(data);
      // Invalider la liste des musiques pour forcer le rechargement
      utils.music.getByTab.invalidate();
      utils.music.getTrending.invalidate();
    },
  });

  const handleSync = () => {
    setSyncResult(null);
    syncMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <Link href="/settings">
          <a className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux paramètres
          </a>
        </Link>

        <Card className="bg-slate-900 border-slate-800 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-bold flex items-center">
                  <Music className="w-6 h-6 mr-2 text-purple-500" />
                  Gestion de la Bibliothèque
                </CardTitle>
                <CardDescription className="text-slate-400">
                  Synchronisez les fichiers audio de Supabase Storage avec la base de données Afritok.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
              <h3 className="font-semibold mb-2 flex items-center">
                <RefreshCw className="w-4 h-4 mr-2 text-blue-400" />
                Synchronisation automatique
              </h3>
              <p className="text-sm text-slate-300 mb-4">
                Cette action va scanner le bucket <code className="bg-slate-700 px-1 rounded text-purple-300">musique</code> sur Supabase et ajouter automatiquement tous les nouveaux fichiers dans votre bibliothèque Afritok.
              </p>
              
              <Button 
                onClick={handleSync} 
                disabled={syncMutation.isLoading}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {syncMutation.isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Synchronisation en cours...
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Synchroniser la bibliothèque
                  </>
                )}
              </Button>
            </div>

            {syncMutation.isError && (
              <div className="bg-red-900/20 border border-red-900/50 rounded-lg p-4 flex items-start text-red-200">
                <AlertCircle className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Erreur de synchronisation</p>
                  <p className="text-sm opacity-80">{(syncMutation.error as any)?.message || "Une erreur est survenue lors de la communication avec le serveur."}</p>
                </div>
              </div>
            )}

            {syncResult && (
              <div className="bg-green-900/20 border border-green-900/50 rounded-lg p-4 flex items-start text-green-200">
                <CheckCircle2 className="w-5 h-5 mr-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold">Synchronisation terminée !</p>
                  <p className="text-sm opacity-80">
                    {syncResult.addedCount > 0 
                      ? `${syncResult.addedCount} nouvelle(s) musique(s) ont été ajoutées avec succès.`
                      : "La bibliothèque est déjà à jour. Aucun nouveau fichier trouvé."}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="text-center text-xs text-slate-500">
          Afritok Admin v1.0 • Music Library Sync
        </div>
      </div>
    </div>
  );
}
