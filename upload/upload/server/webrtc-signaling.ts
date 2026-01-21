/**
 * Module de signalisation WebRTC pour le live streaming
 * 
 * Gère :
 * - Offres et réponses SDP
 * - Candidats ICE
 * - Négociation de connexion
 * - Gestion des pairs
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * Interface pour une offre SDP
 */
export interface SDPOffer {
  type: 'offer';
  sdp: string;
}

/**
 * Interface pour une réponse SDP
 */
export interface SDPAnswer {
  type: 'answer';
  sdp: string;
}

/**
 * Interface pour un candidat ICE
 */
export interface ICECandidate {
  candidate: string;
  sdpMLineIndex: number;
  sdpMid: string;
}

/**
 * Interface pour une connexion pair
 */
export interface PeerConnection {
  peerId: string;
  userId: number;
  offer?: SDPOffer;
  answer?: SDPAnswer;
  iceCandidates: ICECandidate[];
  createdAt: Date;
  connectedAt?: Date;
  state: 'pending' | 'connecting' | 'connected' | 'disconnected' | 'failed';
}

/**
 * Classe pour gérer la signalisation WebRTC
 */
export class WebRTCSignalingManager {
  private peerConnections: Map<string, PeerConnection> = new Map();
  private sessionPeers: Map<string, Set<string>> = new Map(); // sessionId -> peerId[]

  /**
   * Créer une nouvelle connexion pair
   */
  createPeerConnection(peerId: string, userId: number, sessionId: string): PeerConnection {
    const peerConnection: PeerConnection = {
      peerId,
      userId,
      iceCandidates: [],
      createdAt: new Date(),
      state: 'pending',
    };

    this.peerConnections.set(peerId, peerConnection);

    // Ajouter le pair à la session
    if (!this.sessionPeers.has(sessionId)) {
      this.sessionPeers.set(sessionId, new Set());
    }
    this.sessionPeers.get(sessionId)!.add(peerId);

    logger.info('Peer connection created', { peerId, userId, sessionId });
    return peerConnection;
  }

  /**
   * Obtenir une connexion pair
   */
  getPeerConnection(peerId: string): PeerConnection | undefined {
    return this.peerConnections.get(peerId);
  }

  /**
   * Mettre à jour l'offre SDP
   */
  setSDPOffer(peerId: string, offer: SDPOffer): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      logger.warn('Peer connection not found', { peerId });
      return;
    }

    peerConnection.offer = offer;
    peerConnection.state = 'connecting';

    logger.info('SDP offer set', { peerId });
  }

  /**
   * Mettre à jour la réponse SDP
   */
  setSDPAnswer(peerId: string, answer: SDPAnswer): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      logger.warn('Peer connection not found', { peerId });
      return;
    }

    peerConnection.answer = answer;
    peerConnection.state = 'connected';
    peerConnection.connectedAt = new Date();

    logger.info('SDP answer set', { peerId });
  }

  /**
   * Ajouter un candidat ICE
   */
  addICECandidate(peerId: string, candidate: ICECandidate): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      logger.warn('Peer connection not found', { peerId });
      return;
    }

    peerConnection.iceCandidates.push(candidate);

    logger.debug('ICE candidate added', { peerId, candidateCount: peerConnection.iceCandidates.length });
  }

  /**
   * Obtenir tous les candidats ICE
   */
  getICECandidates(peerId: string): ICECandidate[] {
    const peerConnection = this.peerConnections.get(peerId);
    return peerConnection?.iceCandidates || [];
  }

  /**
   * Fermer une connexion pair
   */
  closePeerConnection(peerId: string, sessionId: string): void {
    const peerConnection = this.peerConnections.get(peerId);
    if (!peerConnection) {
      logger.warn('Peer connection not found', { peerId });
      return;
    }

    peerConnection.state = 'disconnected';

    // Retirer le pair de la session
    const sessionPeers = this.sessionPeers.get(sessionId);
    if (sessionPeers) {
      sessionPeers.delete(peerId);
    }

    // Supprimer la connexion
    this.peerConnections.delete(peerId);

    logger.info('Peer connection closed', { peerId, sessionId });
  }

  /**
   * Obtenir tous les pairs d'une session
   */
  getSessionPeers(sessionId: string): PeerConnection[] {
    const peerIds = this.sessionPeers.get(sessionId) || new Set();
    return Array.from(peerIds)
      .map((peerId) => this.peerConnections.get(peerId))
      .filter((pc) => pc !== undefined) as PeerConnection[];
  }

  /**
   * Obtenir le nombre de participants
   */
  getParticipantCount(sessionId: string): number {
    return this.sessionPeers.get(sessionId)?.size || 0;
  }

  /**
   * Vérifier si une session existe
   */
  sessionExists(sessionId: string): boolean {
    return this.sessionPeers.has(sessionId);
  }

  /**
   * Fermer une session complète
   */
  closeSession(sessionId: string): void {
    const peerIds = this.sessionPeers.get(sessionId);
    if (!peerIds) {
      return;
    }

    // Fermer tous les pairs
    peerIds.forEach((peerId) => {
      const peerConnection = this.peerConnections.get(peerId);
      if (peerConnection) {
        peerConnection.state = 'disconnected';
        this.peerConnections.delete(peerId);
      }
    });

    // Supprimer la session
    this.sessionPeers.delete(sessionId);

    logger.info('Session closed', { sessionId });
  }

  /**
   * Obtenir les statistiques de la session
   */
  getSessionStats(sessionId: string) {
    const peerIds = this.sessionPeers.get(sessionId) || new Set();
    const peers = Array.from(peerIds)
      .map((peerId) => this.peerConnections.get(peerId))
      .filter((pc) => pc !== undefined) as PeerConnection[];

    return {
      sessionId,
      participantCount: peers.length,
      connectedCount: peers.filter((p) => p.state === 'connected').length,
      connectingCount: peers.filter((p) => p.state === 'connecting').length,
      failedCount: peers.filter((p) => p.state === 'failed').length,
      peers: peers.map((p) => ({
        peerId: p.peerId,
        userId: p.userId,
        state: p.state,
        connectedAt: p.connectedAt,
      })),
    };
  }
}

// Singleton
let instance: WebRTCSignalingManager | null = null;

export function getWebRTCSignalingManager(): WebRTCSignalingManager {
  if (!instance) {
    instance = new WebRTCSignalingManager();
  }
  return instance;
}
