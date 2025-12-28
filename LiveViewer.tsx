import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { trpc } from '@/lib/trpc';
import { Loader2, Mic, MicOff, Video, VideoOff, Users, Send, X } from 'lucide-react';

interface LiveViewerProps {
  sessionId: string;
  onClose?: () => void;
}

export default function LiveViewer({ sessionId, onClose }: LiveViewerProps) {
  const [isJoined, setIsJoined] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Récupérer les infos de la session
  const sessionQuery = trpc.live.getSession.useQuery({ sessionId });
  const participantsQuery = trpc.live.getParticipants.useQuery({ sessionId });

  // Mutations
  const joinSessionMutation = trpc.live.joinSession.useMutation();
  const leaveSessionMutation = trpc.live.leaveSession.useMutation();
  const updateStatusMutation = trpc.live.updateParticipantStatus.useMutation();

  // Rejoindre la session
  const handleJoin = async () => {
    setIsLoading(true);
    try {
      await joinSessionMutation.mutateAsync({
        sessionId,
        role: 'guest',
      });

      // Demander l'accès à la caméra et au microphone
      if (sessionQuery.data?.type === 'video') {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });

        localStreamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } else if (sessionQuery.data?.type === 'audio') {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });

        localStreamRef.current = stream;
      }

      setIsJoined(true);
      participantsQuery.refetch();
    } catch (error) {
      console.error('Erreur lors de la connexion:', error);
      alert('Erreur lors de la connexion à la session');
    } finally {
      setIsLoading(false);
    }
  };

  // Quitter la session
  const handleLeave = async () => {
    try {
      await leaveSessionMutation.mutateAsync({ sessionId });

      // Arrêter les streams
      if (localStreamRef.current) {
        localStreamRef.current.getTracks().forEach((track) => track.stop());
        localStreamRef.current = null;
      }

      setIsJoined(false);
      setIsMuted(false);
      setIsVideoOff(false);
      onClose?.();
    } catch (error) {
      console.error('Erreur lors de la déconnexion:', error);
    }
  };

  // Basculer le microphone
  const handleToggleMute = async () => {
    const newMutedState = !isMuted;
    setIsMuted(newMutedState);

    try {
      await updateStatusMutation.mutateAsync({
        sessionId,
        isMuted: newMutedState,
      });

      if (localStreamRef.current) {
        localStreamRef.current.getAudioTracks().forEach((track) => {
          track.enabled = !newMutedState;
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setIsMuted(!newMutedState);
    }
  };

  // Basculer la vidéo
  const handleToggleVideo = async () => {
    const newVideoOffState = !isVideoOff;
    setIsVideoOff(newVideoOffState);

    try {
      await updateStatusMutation.mutateAsync({
        sessionId,
        isVideoOff: newVideoOffState,
      });

      if (localStreamRef.current) {
        localStreamRef.current.getVideoTracks().forEach((track) => {
          track.enabled = !newVideoOffState;
        });
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
      setIsVideoOff(!newVideoOffState);
    }
  };

  if (sessionQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!sessionQuery.data) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-center text-gray-500">Session non trouvée</p>
        </CardContent>
      </Card>
    );
  }

  const session = sessionQuery.data;

  return (
    <div className="w-full max-w-2xl mx-auto">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{session.title}</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              {session.participantCount} participant(s) • {session.viewerCount} spectateur(s)
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Vidéo */}
          {session.type === 'video' && (
            <div className="bg-black rounded-lg overflow-hidden aspect-video">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Infos */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Hôte</p>
              <p className="font-medium">{session.hostUsername}</p>
            </div>
            <div>
              <p className="text-gray-500">Type</p>
              <p className="font-medium capitalize">{session.type}</p>
            </div>
          </div>

          {/* Participants */}
          {isJoined && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4" />
                <p className="text-sm font-medium">Participants</p>
              </div>
              <div className="space-y-2">
                {participantsQuery.data?.map((p) => (
                  <div key={p.userId} className="flex items-center justify-between text-sm">
                    <span>{p.username}</span>
                    <div className="flex gap-1">
                      {p.isMuted && <MicOff className="h-3 w-3 text-red-500" />}
                      {p.isVideoOff && <VideoOff className="h-3 w-3 text-red-500" />}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Contrôles */}
          {!isJoined ? (
            <Button onClick={handleJoin} disabled={isLoading} className="w-full" size="lg">
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isLoading ? 'Connexion...' : 'Rejoindre le live'}
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  variant={isMuted ? 'destructive' : 'default'}
                  size="sm"
                  onClick={handleToggleMute}
                  className="flex-1"
                >
                  {isMuted ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  {isMuted ? 'Réactiver' : 'Désactiver'}
                </Button>

                {session.type === 'video' && (
                  <Button
                    variant={isVideoOff ? 'destructive' : 'default'}
                    size="sm"
                    onClick={handleToggleVideo}
                    className="flex-1"
                  >
                    {isVideoOff ? <VideoOff className="h-4 w-4" /> : <Video className="h-4 w-4" />}
                    {isVideoOff ? 'Activer' : 'Désactiver'}
                  </Button>
                )}

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleLeave}
                  className="flex-1"
                >
                  Quitter
                </Button>
              </div>

              {/* Chat */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Envoyer un message..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm"
                />
                <Button size="sm" variant="outline">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
