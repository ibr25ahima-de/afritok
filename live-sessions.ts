/**
 * Module de gestion des sessions live
 * 
 * Gère :
 * - Création et fermeture de sessions
 * - Participants et invitations
 * - Statut du live
 * - Métadonnées du live
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Types de live
 */
export type LiveType = 'video' | 'audio' | 'screen-share';

/**
 * États du live
 */
export type LiveState = 'pending' | 'starting' | 'live' | 'ending' | 'ended';

/**
 * Interface pour un participant
 */
export interface LiveParticipant {
  userId: number;
  username: string;
  joinedAt: Date;
  role: 'host' | 'guest' | 'viewer';
  isMuted: boolean;
  isVideoOff: boolean;
  peerId?: string;
}

/**
 * Interface pour une session live
 */
export interface LiveSession {
  sessionId: string;
  hostId: number;
  hostUsername: string;
  title: string;
  description: string;
  type: LiveType;
  state: LiveState;
  participants: Map<number, LiveParticipant>;
  maxParticipants: number;
  viewerCount: number;
  startedAt: Date;
  endedAt?: Date;
  isPublic: boolean;
  thumbnail?: string;
  recordingUrl?: string;
  rewardId?: string; // ID de la récompense associée
  giftRevenue: number; // Revenus des cadeaux en cents
}

/**
 * Classe pour gérer les sessions live
 */
export class LiveSessionsManager {
  private sessions: Map<string, LiveSession> = new Map();
  private userSessions: Map<number, string> = new Map(); // userId -> sessionId

  /**
   * Créer une nouvelle session live
   */
  createSession(
    hostId: number,
    hostUsername: string,
    title: string,
    description: string,
    type: LiveType = 'video',
    isPublic: boolean = true,
    maxParticipants: number = 50
  ): LiveSession {
    const sessionId = 'live_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const session: LiveSession = {
      sessionId,
      hostId,
      hostUsername,
      title,
      description,
      type,
      state: 'pending',
      participants: new Map(),
      maxParticipants,
      viewerCount: 0,
      startedAt: new Date(),
      isPublic,
      giftRevenue: 0,
    };

    // Ajouter l'hôte comme participant
    session.participants.set(hostId, {
      userId: hostId,
      username: hostUsername,
      joinedAt: new Date(),
      role: 'host',
      isMuted: false,
      isVideoOff: false,
    });

    this.sessions.set(sessionId, session);
    this.userSessions.set(hostId, sessionId);

    logger.info('Live session created', {
      sessionId,
      hostId,
      title,
      type,
    });

    return session;
  }

  /**
   * Obtenir une session
   */
  getSession(sessionId: string): LiveSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Obtenir la session d'un utilisateur
   */
  getUserSession(userId: number): LiveSession | undefined {
    const sessionId = this.userSessions.get(userId);
    return sessionId ? this.sessions.get(sessionId) : undefined;
  }

  /**
   * Ajouter un participant
   */
  addParticipant(
    sessionId: string,
    userId: number,
    username: string,
    role: 'guest' | 'viewer' = 'viewer'
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return false;
    }

    // Vérifier la limite de participants (hôte + guests)
    const guestCount = Array.from(session.participants.values()).filter((p) => p.role === 'guest').length;
    if (role === 'guest' && guestCount >= session.maxParticipants - 1) {
      logger.warn('Max participants reached', { sessionId });
      return false;
    }

    // Ajouter le participant
    session.participants.set(userId, {
      userId,
      username,
      joinedAt: new Date(),
      role,
      isMuted: false,
      isVideoOff: false,
    });

    if (role === 'viewer') {
      session.viewerCount++;
    }

    logger.info('Participant added', { sessionId, userId, role });
    return true;
  }

  /**
   * Retirer un participant
   */
  removeParticipant(sessionId: string, userId: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return false;
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      logger.warn('Participant not found', { sessionId, userId });
      return false;
    }

    if (participant.role === 'viewer') {
      session.viewerCount--;
    }

    session.participants.delete(userId);

    logger.info('Participant removed', { sessionId, userId });

    // Si l'hôte part, fermer la session
    if (participant.role === 'host') {
      this.closeSession(sessionId);
      return true;
    }

    return true;
  }

  /**
   * Mettre à jour l'état du live
   */
  setSessionState(sessionId: string, state: LiveState): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return;
    }

    session.state = state;

    if (state === 'ended') {
      session.endedAt = new Date();
    }

    logger.info('Session state updated', { sessionId, state });
  }

  /**
   * Mettre à jour le statut audio/vidéo d'un participant
   */
  updateParticipantStatus(
    sessionId: string,
    userId: number,
    isMuted?: boolean,
    isVideoOff?: boolean
  ): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return false;
    }

    const participant = session.participants.get(userId);
    if (!participant) {
      logger.warn('Participant not found', { sessionId, userId });
      return false;
    }

    if (isMuted !== undefined) {
      participant.isMuted = isMuted;
    }

    if (isVideoOff !== undefined) {
      participant.isVideoOff = isVideoOff;
    }

    logger.debug('Participant status updated', { sessionId, userId, isMuted, isVideoOff });
    return true;
  }

  /**
   * Fermer une session
   */
  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return;
    }

    session.state = 'ended';
    session.endedAt = new Date();

    // Retirer tous les utilisateurs
    session.participants.forEach((_, userId) => {
      this.userSessions.delete(userId);
    });

    // Supprimer la session après un délai (pour les logs)
    setTimeout(() => {
      this.sessions.delete(sessionId);
    }, 60000); // 1 minute

    logger.info('Session closed', {
      sessionId,
      duration: session.endedAt.getTime() - session.startedAt.getTime(),
      participantCount: session.participants.size,
    });
  }

  /**
   * Obtenir toutes les sessions actives
   */
  getActiveSessions(): LiveSession[] {
    return Array.from(this.sessions.values()).filter((s) => s.state !== 'ended');
  }

  /**
   * Obtenir les sessions publiques
   */
  getPublicSessions(): LiveSession[] {
    return this.getActiveSessions().filter((s) => s.isPublic && s.state === 'live');
  }

  /**
   * Ajouter un revenu de cadeau a une session
   */
  addGiftRevenue(sessionId: string, amount: number): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) {
      logger.warn('Session not found', { sessionId });
      return false;
    }

    session.giftRevenue += amount;
    logger.debug('Gift revenue added', { sessionId, amount, total: session.giftRevenue });
    return true;
  }

  /**
   * Obtenir le revenu des cadeaux d'une session
   */
  getGiftRevenue(sessionId: string): number {
    const session = this.sessions.get(sessionId);
    return session ? session.giftRevenue : 0;
  }

  /**
   * Obtenir les statistiques d'une session
   */
  getSessionStats(sessionId: string) {
    const session = this.sessions.get(sessionId);
    if (!session) {
      return null;
    }

    const guests = Array.from(session.participants.values()).filter((p) => p.role === 'guest');
    const viewers = Array.from(session.participants.values()).filter((p) => p.role === 'viewer');

    return {
      sessionId,
      title: session.title,
      hostUsername: session.hostUsername,
      type: session.type,
      state: session.state,
      duration: session.endedAt ? session.endedAt.getTime() - session.startedAt.getTime() : 0,
      participantCount: session.participants.size,
      guestCount: guests.length,
      viewerCount: session.viewerCount,
      maxParticipants: session.maxParticipants,
      giftRevenue: session.giftRevenue,
    };
  }
}

// Singleton
let instance: LiveSessionsManager | null = null;

export function getLiveSessionsManager(): LiveSessionsManager {
  if (!instance) {
    instance = new LiveSessionsManager();
  }
  return instance;
}
