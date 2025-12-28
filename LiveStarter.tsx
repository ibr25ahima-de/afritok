import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, Video, Mic } from 'lucide-react';

type LiveType = 'video' | 'audio' | 'screen-share';

export default function LiveStarter() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<LiveType>('video');
  const [isPublic, setIsPublic] = useState(true);
  const [maxParticipants, setMaxParticipants] = useState(4);
  const [isLoading, setIsLoading] = useState(false);

  const createSessionMutation = trpc.live.createSession.useMutation();

  const handleStartLive = async () => {
    if (!title.trim()) {
      alert('Veuillez entrer un titre');
      return;
    }

    setIsLoading(true);
    try {
      const session = await createSessionMutation.mutateAsync({
        title,
        description,
        type,
        isPublic,
        maxParticipants,
      });

      // Rediriger vers la page du live
      window.location.href = `/live/${session.sessionId}`;
    } catch (error) {
      console.error('Erreur lors du démarrage du live:', error);
      alert('Erreur lors du démarrage du live');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>Démarrer un Live</CardTitle>
          <CardDescription>Créez une nouvelle session live et invitez vos amis</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Titre */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Titre du live</label>
            <Input
              placeholder="Ex: Tutoriel de danse"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isLoading}
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Description (optionnel)</label>
            <Textarea
              placeholder="Décrivez votre live..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
          </div>

          {/* Type de live */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Type de live</label>
            <div className="grid grid-cols-3 gap-2">
              {(['video', 'audio', 'screen-share'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  disabled={isLoading}
                  className={`p-3 rounded-lg border-2 transition-colors ${
                    type === t
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex flex-col items-center gap-1">
                    {t === 'video' && <Video size={20} />}
                    {t === 'audio' && <Mic size={20} />}
                    {t === 'screen-share' && <Video size={20} />}
                    <span className="text-xs capitalize">{t}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Participants max */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre max de participants</label>
            <select
              value={maxParticipants}
              onChange={(e) => setMaxParticipants(parseInt(e.target.value))}
              disabled={isLoading}
              className="w-full p-2 border rounded-lg"
            >
              <option value={2}>2 (Vous + 1)</option>
              <option value={3}>3 (Vous + 2)</option>
              <option value={4}>4 (Vous + 3)</option>
              <option value={6}>6 (Vous + 5)</option>
              <option value={10}>10 (Vous + 9)</option>
            </select>
          </div>

          {/* Public/Privé */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              disabled={isLoading}
              className="rounded"
            />
            <label htmlFor="isPublic" className="text-sm">
              Rendre ce live public (visible dans la découverte)
            </label>
          </div>

          {/* Bouton de démarrage */}
          <Button
            onClick={handleStartLive}
            disabled={isLoading || !title.trim()}
            className="w-full"
            size="lg"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isLoading ? 'Démarrage...' : 'Démarrer le live'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
