/**
 * Module de gestion des invitations live
 * 
 * Gère :
 * - Envoi d'invitations
 * - Acceptation/Refus d'invitations
 * - Gestion des invitations en attente
 * - Notifications d'invitations
 */

import { getLogger } from './logging';

const logger = getLogger();

/**
 * État d'une invitation
 */
export type InvitationState = 'pending' | 'accepted' | 'rejected' | 'expired' | 'cancelled';

/**
 * Interface pour une invitation live
 */
export interface LiveInvitation {
  invitationId: string;
  sessionId: string;
  fromUserId: number;
  fromUsername: string;
  toUserId: number;
  toUsername: string;
  state: InvitationState;
  createdAt: Date;
  respondedAt?: Date;
  expiresAt: Date;
  message?: string;
}

/**
 * Classe pour gérer les invitations live
 */
export class LiveInvitationsManager {
  private invitations: Map<string, LiveInvitation> = new Map();
  private userInvitations: Map<number, Set<string>> = new Map(); // userId -> invitationIds
  private sessionInvitations: Map<string, Set<string>> = new Map(); // sessionId -> invitationIds

  /**
   * Envoyer une invitation
   */
  sendInvitation(
    sessionId: string,
    fromUserId: number,
    fromUsername: string,
    toUserId: number,
    toUsername: string,
    message?: string,
    expiresIn: number = 300000 // 5 minutes par défaut
  ): LiveInvitation {
    const invitationId = 'inv_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    const invitation: LiveInvitation = {
      invitationId,
      sessionId,
      fromUserId,
      fromUsername,
      toUserId,
      toUsername,
      state: 'pending',
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + expiresIn),
      message,
    };

    this.invitations.set(invitationId, invitation);

    // Ajouter à la liste des invitations de l'utilisateur
    if (!this.userInvitations.has(toUserId)) {
      this.userInvitations.set(toUserId, new Set());
    }
    this.userInvitations.get(toUserId)!.add(invitationId);

    // Ajouter à la liste des invitations de la session
    if (!this.sessionInvitations.has(sessionId)) {
      this.sessionInvitations.set(sessionId, new Set());
    }
    this.sessionInvitations.get(sessionId)!.add(invitationId);

    logger.info('Live invitation sent', {
      invitationId,
      sessionId,
      fromUserId,
      toUserId,
    });

    return invitation;
  }

  /**
   * Obtenir une invitation
   */
  getInvitation(invitationId: string): LiveInvitation | undefined {
    return this.invitations.get(invitationId);
  }

  /**
   * Obtenir les invitations en attente d'un utilisateur
   */
  getPendingInvitations(userId: number): LiveInvitation[] {
    const invitationIds = this.userInvitations.get(userId) || new Set();
    return Array.from(invitationIds)
      .map((id) => this.invitations.get(id))
      .filter((inv) => inv !== undefined && inv.state === 'pending' && inv.expiresAt > new Date()) as LiveInvitation[];
  }

  /**
   * Obtenir toutes les invitations d'un utilisateur
   */
  getUserInvitations(userId: number): LiveInvitation[] {
    const invitationIds = this.userInvitations.get(userId) || new Set();
    return Array.from(invitationIds)
      .map((id) => this.invitations.get(id))
      .filter((inv) => inv !== undefined) as LiveInvitation[];
  }

  /**
   * Obtenir les invitations d'une session
   */
  getSessionInvitations(sessionId: string): LiveInvitation[] {
    const invitationIds = this.sessionInvitations.get(sessionId) || new Set();
    return Array.from(invitationIds)
      .map((id) => this.invitations.get(id))
      .filter((inv) => inv !== undefined) as LiveInvitation[];
  }

  /**
   * Accepter une invitation
   */
  acceptInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    if (invitation.state !== 'pending') {
      logger.warn('Invitation already responded', { invitationId, state: invitation.state });
      return false;
    }

    if (invitation.expiresAt < new Date()) {
      logger.warn('Invitation expired', { invitationId });
      invitation.state = 'expired';
      return false;
    }

    invitation.state = 'accepted';
    invitation.respondedAt = new Date();

    logger.info('Invitation accepted', {
      invitationId,
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
    });

    return true;
  }

  /**
   * Refuser une invitation
   */
  rejectInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    if (invitation.state !== 'pending') {
      logger.warn('Invitation already responded', { invitationId, state: invitation.state });
      return false;
    }

    invitation.state = 'rejected';
    invitation.respondedAt = new Date();

    logger.info('Invitation rejected', {
      invitationId,
      fromUserId: invitation.fromUserId,
      toUserId: invitation.toUserId,
    });

    return true;
  }

  /**
   * Annuler une invitation
   */
  cancelInvitation(invitationId: string): boolean {
    const invitation = this.invitations.get(invitationId);
    if (!invitation) {
      logger.warn('Invitation not found', { invitationId });
      return false;
    }

    if (invitation.state !== 'pending') {
      logger.warn('Cannot cancel responded invitation', { invitationId, state: invitation.state });
      return false;
    }

    invitation.state = 'cancelled';

    logger.info('Invitation cancelled', { invitationId });

    return true;
  }

  /**
   * Nettoyer les invitations expirées
   */
  cleanupExpiredInvitations(): number {
    let count = 0;
    const now = new Date();

    this.invitations.forEach((invitation, invitationId) => {
      if (invitation.state === 'pending' && invitation.expiresAt < now) {
        invitation.state = 'expired';
        count++;
      }
    });

    if (count > 0) {
      logger.info('Expired invitations cleaned up', { count });
    }

    return count;
  }

  /**
   * Obtenir les statistiques d'une session
   */
  getSessionInvitationStats(sessionId: string) {
    const invitations = this.getSessionInvitations(sessionId);

    return {
      sessionId,
      totalInvitations: invitations.length,
      pendingCount: invitations.filter((i) => i.state === 'pending').length,
      acceptedCount: invitations.filter((i) => i.state === 'accepted').length,
      rejectedCount: invitations.filter((i) => i.state === 'rejected').length,
      expiredCount: invitations.filter((i) => i.state === 'expired').length,
      cancelledCount: invitations.filter((i) => i.state === 'cancelled').length,
    };
  }

  /**
   * Obtenir les statistiques d'un utilisateur
   */
  getUserInvitationStats(userId: number) {
    const invitations = this.getUserInvitations(userId);

    return {
      userId,
      totalInvitations: invitations.length,
      pendingCount: invitations.filter((i) => i.state === 'pending').length,
      acceptedCount: invitations.filter((i) => i.state === 'accepted').length,
      rejectedCount: invitations.filter((i) => i.state === 'rejected').length,
      expiredCount: invitations.filter((i) => i.state === 'expired').length,
      cancelledCount: invitations.filter((i) => i.state === 'cancelled').length,
    };
  }
}

// Singleton
let instance: LiveInvitationsManager | null = null;

export function getLiveInvitationsManager(): LiveInvitationsManager {
  if (!instance) {
    instance = new LiveInvitationsManager();
  }
  return instance;
}
