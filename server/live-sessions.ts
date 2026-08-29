import { getLogger } from './logging';
import { isStageRole, normalizeStageCapacity } from './live/stage-rules';

const logger = getLogger();
export type LiveType = 'video' | 'audio' | 'screen-share';
export type LiveState = 'pending' | 'starting' | 'live' | 'ending' | 'ended';
export type LiveRole = 'host' | 'admin' | 'guest' | 'viewer';

export interface LiveParticipant {
  userId: number;
  username: string;
  joinedAt: Date;
  role: LiveRole;
  isMuted: boolean;
  isVideoOff: boolean;
  peerId?: string;
}

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
  rewardId?: string;
  giftRevenue: number;
}

export class LiveSessionsManager {
  private sessions: Map<string, LiveSession> = new Map();
  private userSessions: Map<number, string> = new Map();

  createSession(hostId: number, hostUsername: string, title: string, description: string, type: LiveType = 'video', isPublic = true, maxParticipants = 50): LiveSession {
    const sessionId = 'live_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    const capacity = normalizeStageCapacity(maxParticipants);
    const session: LiveSession = { sessionId, hostId, hostUsername, title, description, type, state: 'pending', participants: new Map(), maxParticipants: capacity, viewerCount: 0, startedAt: new Date(), isPublic, giftRevenue: 0 };
    session.participants.set(hostId, { userId: hostId, username: hostUsername, joinedAt: new Date(), role: 'host', isMuted: false, isVideoOff: false });
    this.sessions.set(sessionId, session);
    this.userSessions.set(hostId, sessionId);
    logger.info('Live session created', { sessionId, hostId, title, type, maxParticipants: capacity });
    return session;
  }

  getSession(sessionId: string): LiveSession | undefined { return this.sessions.get(sessionId); }
  getUserSession(userId: number): LiveSession | undefined { const id = this.userSessions.get(userId); return id ? this.sessions.get(id) : undefined; }

  addParticipant(sessionId: string, userId: number, username: string, role: 'guest' | 'viewer' = 'viewer'): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.state === 'ended') return false;
    const existing = session.participants.get(userId);
    if (existing) {
      if (role === 'guest' && existing.role === 'viewer') {
        const stageCount = Array.from(session.participants.values()).filter((p) => isStageRole(p.role)).length;
        if (stageCount >= session.maxParticipants) return false;
        existing.role = 'guest';
        session.viewerCount = Math.max(0, session.viewerCount - 1);
        return true;
      }
      return true;
    }
    const stageCount = Array.from(session.participants.values()).filter((p) => isStageRole(p.role)).length;
    if (role === 'guest' && stageCount >= session.maxParticipants) return false;
    session.participants.set(userId, { userId, username, joinedAt: new Date(), role, isMuted: false, isVideoOff: false });
    if (role === 'viewer') session.viewerCount++;
    return true;
  }

  removeParticipant(sessionId: string, userId: number): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    const participant = session.participants.get(userId); if (!participant) return false;
    if (participant.role === 'viewer') session.viewerCount = Math.max(0, session.viewerCount - 1);
    session.participants.delete(userId); this.userSessions.delete(userId);
    if (participant.role === 'host') this.closeSession(sessionId);
    return true;
  }

  setSessionState(sessionId: string, state: LiveState): void { const session = this.sessions.get(sessionId); if (!session) return; session.state = state; if (state === 'ended') session.endedAt = new Date(); }

  updateParticipantStatus(sessionId: string, userId: number, isMuted?: boolean, isVideoOff?: boolean): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    const participant = session.participants.get(userId); if (!participant) return false;
    if (isMuted !== undefined) participant.isMuted = isMuted;
    if (isVideoOff !== undefined) participant.isVideoOff = isVideoOff;
    return true;
  }

  setParticipantRole(sessionId: string, userId: number, role: 'admin' | 'guest' | 'viewer'): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    const participant = session.participants.get(userId); if (!participant || participant.role === 'host') return false;
    const wasViewer = participant.role === 'viewer';
    const willViewer = role === 'viewer';
    if (wasViewer && !willViewer) {
      const stageCount = Array.from(session.participants.values()).filter((p) => isStageRole(p.role)).length;
      if (stageCount >= session.maxParticipants) return false;
      session.viewerCount = Math.max(0, session.viewerCount - 1);
    }
    if (!wasViewer && willViewer) session.viewerCount++;
    participant.role = role;
    return true;
  }

  setGuestLiveState(sessionId: string, userId: number, isMuted: boolean, isVideoOff: boolean): boolean {
    const session = this.sessions.get(sessionId); if (!session) return false;
    const participant = session.participants.get(userId); if (!participant || !isStageRole(participant.role)) return false;
    participant.isMuted = isMuted; participant.isVideoOff = isVideoOff; return true;
  }

  closeSession(sessionId: string): void {
    const session = this.sessions.get(sessionId); if (!session) return;
    session.state = 'ended'; session.endedAt = new Date();
    session.participants.forEach((_, userId) => this.userSessions.delete(userId));
    setTimeout(() => this.sessions.delete(sessionId), 60000);
    logger.info('Live session closed', { sessionId, participantCount: session.participants.size });
  }

  getActiveSessions(): LiveSession[] { return Array.from(this.sessions.values()).filter((s) => s.state !== 'ended'); }
  getPublicSessions(): LiveSession[] { return this.getActiveSessions().filter((s) => s.isPublic && s.state === 'live'); }
  addGiftRevenue(sessionId: string, amount: number): boolean { const s = this.sessions.get(sessionId); if (!s) return false; s.giftRevenue += amount; return true; }
  getGiftRevenue(sessionId: string): number { return this.sessions.get(sessionId)?.giftRevenue || 0; }

  getSessionStats(sessionId: string) {
    const s = this.sessions.get(sessionId); if (!s) return null;
    const guests = Array.from(s.participants.values()).filter((p) => p.role === 'guest');
    return { sessionId, title: s.title, hostUsername: s.hostUsername, type: s.type, state: s.state, duration: s.endedAt ? s.endedAt.getTime() - s.startedAt.getTime() : 0, participantCount: s.participants.size, guestCount: guests.length, viewerCount: s.viewerCount, maxParticipants: s.maxParticipants, giftRevenue: s.giftRevenue };
  }
}

let instance: LiveSessionsManager | null = null;
export function getLiveSessionsManager(): LiveSessionsManager { if (!instance) instance = new LiveSessionsManager(); return instance; }
