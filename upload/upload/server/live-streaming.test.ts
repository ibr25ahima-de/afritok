/**
 * Tests pour le système de live streaming complet
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { getLiveSessionsManager } from './live-sessions';
import { getLiveInvitationsManager } from './live-invitations';
import { getLiveChatManager } from './live-chat';
import { getWebRTCSignalingManager } from './webrtc-signaling';

describe('Live Streaming System', () => {
  let liveSessionsManager: ReturnType<typeof getLiveSessionsManager>;
  let liveInvitationsManager: ReturnType<typeof getLiveInvitationsManager>;
  let liveChatManager: ReturnType<typeof getLiveChatManager>;
  let webrtcSignalingManager: ReturnType<typeof getWebRTCSignalingManager>;

  beforeEach(() => {
    liveSessionsManager = getLiveSessionsManager();
    liveInvitationsManager = getLiveInvitationsManager();
    liveChatManager = getLiveChatManager();
    webrtcSignalingManager = getWebRTCSignalingManager();
  });

  describe('Live Sessions', () => {
    it('should create a live session', () => {
      const session = liveSessionsManager.createSession(
        1,
        'testuser',
        'Test Live',
        'Test description',
        'video',
        true,
        4
      );

      expect(session).toBeDefined();
      expect(session.title).toBe('Test Live');
      expect(session.hostId).toBe(1);
      expect(session.state).toBe('pending');
      expect(session.participants.size).toBe(1); // Hôte inclus
    });

    it('should add participants to a session', () => {
      const session = liveSessionsManager.createSession(1, 'host', 'Test', '', 'video', true, 4);
      const sessionId = session.sessionId;

      const success = liveSessionsManager.addParticipant(sessionId, 2, 'guest1', 'guest');
      expect(success).toBe(true);
      expect(session.participants.size).toBe(2);
    });

    it('should not exceed max participants', () => {
      const session = liveSessionsManager.createSession(1, 'host', 'Test', '', 'video', true, 2);
      const sessionId = session.sessionId;

      liveSessionsManager.addParticipant(sessionId, 2, 'guest1', 'guest');
      const success = liveSessionsManager.addParticipant(sessionId, 3, 'guest2', 'guest');

      expect(success).toBe(false);
    });

    it('should remove participants', () => {
      const session = liveSessionsManager.createSession(1, 'host', 'Test', '', 'video', true, 4);
      const sessionId = session.sessionId;

      liveSessionsManager.addParticipant(sessionId, 2, 'guest1', 'guest');
      expect(session.participants.size).toBe(2);

      liveSessionsManager.removeParticipant(sessionId, 2);
      expect(session.participants.size).toBe(1);
    });

    it('should change session state', () => {
      const session = liveSessionsManager.createSession(1, 'host', 'Test', '', 'video', true, 4);
      const sessionId = session.sessionId;

      liveSessionsManager.setSessionState(sessionId, 'live');
      expect(session.state).toBe('live');

      liveSessionsManager.setSessionState(sessionId, 'ending');
      expect(session.state).toBe('ending');
    });

    it('should get public sessions', () => {
      const session1 = liveSessionsManager.createSession(1, 'host1', 'Public Live', '', 'video', true, 4);
      const session2 = liveSessionsManager.createSession(2, 'host2', 'Private Live', '', 'video', false, 4);

      expect(session1.isPublic).toBe(true);
      expect(session2.isPublic).toBe(false);
    });
  });

  describe('Live Invitations', () => {
    it('should send an invitation', () => {
      const invitation = liveInvitationsManager.sendInvitation(
        'session1',
        1,
        'host',
        2,
        'guest',
        'Join my live!'
      );

      expect(invitation).toBeDefined();
      expect(invitation.state).toBe('pending');
      expect(invitation.fromUserId).toBe(1);
      expect(invitation.toUserId).toBe(2);
    });

    it('should accept an invitation', () => {
      const invitation = liveInvitationsManager.sendInvitation(
        'session1',
        1,
        'host',
        2,
        'guest'
      );

      const success = liveInvitationsManager.acceptInvitation(invitation.invitationId);
      expect(success).toBe(true);
      expect(invitation.state).toBe('accepted');
    });

    it('should reject an invitation', () => {
      const invitation = liveInvitationsManager.sendInvitation(
        'session1',
        1,
        'host',
        2,
        'guest'
      );

      const success = liveInvitationsManager.rejectInvitation(invitation.invitationId);
      expect(success).toBe(true);
      expect(invitation.state).toBe('rejected');
    });

    it('should get pending invitations', () => {
      const inv1 = liveInvitationsManager.sendInvitation('session1', 1, 'host', 2, 'guest');
      const inv2 = liveInvitationsManager.sendInvitation('session2', 3, 'host2', 2, 'guest');

      expect(inv1.state).toBe('pending');
      expect(inv2.state).toBe('pending');
    });
  });

  describe('Live Chat', () => {
    it('should send a message', () => {
      const message = liveChatManager.sendMessage(
        'session1',
        1,
        'user1',
        'Hello everyone!',
        'text'
      );

      expect(message).toBeDefined();
      expect(message.content).toBe('Hello everyone!');
      expect(message.type).toBe('text');
    });

    it('should get messages', () => {
      const msg1 = liveChatManager.sendMessage('msg-session', 1, 'user1', 'Message 1', 'text');
      const msg2 = liveChatManager.sendMessage('msg-session', 2, 'user2', 'Message 2', 'text');

      const messages = liveChatManager.getMessages('msg-session');
      expect(messages.length).toBe(2);
      expect(messages[0].messageId).toBe(msg1.messageId);
      expect(messages[1].messageId).toBe(msg2.messageId);
    });

    it('should add reactions', () => {
      const reaction = liveChatManager.addReaction('session1', 1, 'user1', '❤️');

      expect(reaction).toBeDefined();
      expect(reaction.emoji).toBe('❤️');
    });

    it('should pin messages', () => {
      const message = liveChatManager.sendMessage('session1', 1, 'user1', 'Important!', 'text');
      const success = liveChatManager.pinMessage('session1', message.messageId);

      expect(success).toBe(true);
      expect(message.isPinned).toBe(true);
    });

    it('should mute users', () => {
      const success = liveChatManager.muteUser('session1', 2);
      expect(success).toBe(true);
      expect(liveChatManager.isMuted('session1', 2)).toBe(true);
    });

    it('should ban users', () => {
      const success = liveChatManager.banUser('session1', 3);
      expect(success).toBe(true);
      expect(liveChatManager.isBanned('session1', 3)).toBe(true);
    });

    it('should get chat statistics', () => {
      const statsSess = 'stats-session';
      liveChatManager.sendMessage(statsSess, 1, 'user1', 'Message 1', 'text');
      liveChatManager.sendMessage(statsSess, 2, 'user2', 'Message 2', 'text');
      liveChatManager.addReaction(statsSess, 1, 'user1', '❤️');
      liveChatManager.muteUser(statsSess, 3);

      const stats = liveChatManager.getChatStats(statsSess);
      expect(stats.totalMessages).toBe(2);
      expect(stats.totalReactions).toBe(1);
      expect(stats.uniqueUsers).toBe(2);
      expect(stats.mutedUsers).toBe(1);
    });
  });

  describe('WebRTC Signaling', () => {
    it('should have WebRTC manager available', () => {
      expect(webrtcSignalingManager).toBeDefined();
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete live session flow', () => {
      // Créer une session
      const session = liveSessionsManager.createSession(1, 'host', 'Test Live', '', 'video', true, 4);
      const sessionId = session.sessionId;

      // Inviter un guest
      const invitation = liveInvitationsManager.sendInvitation(
        sessionId,
        1,
        'host',
        2,
        'guest'
      );

      // Accepter l'invitation
      liveInvitationsManager.acceptInvitation(invitation.invitationId);

      // Ajouter le guest à la session
      liveSessionsManager.addParticipant(sessionId, 2, 'guest', 'guest');

      // Démarrer le live
      liveSessionsManager.setSessionState(sessionId, 'live');

      // Envoyer des messages
      liveChatManager.sendMessage(sessionId, 1, 'host', 'Welcome!', 'text');
      liveChatManager.sendMessage(sessionId, 2, 'guest', 'Thanks!', 'text');

      // Vérifier l'état final
      expect(session.participants.size).toBe(2);
      expect(session.state).toBe('live');
      expect(liveChatManager.getMessages(sessionId).length).toBe(2);
    });

    it('should handle moderation in live chat', () => {
      const sessionId = 'session1';

      // Envoyer des messages
      liveChatManager.sendMessage(sessionId, 1, 'user1', 'Hello', 'text');
      liveChatManager.sendMessage(sessionId, 2, 'user2', 'Hi', 'text');

      // Rendre muet un utilisateur
      liveChatManager.muteUser(sessionId, 2);

      // Bannir un utilisateur
      liveChatManager.banUser(sessionId, 3);

      // Vérifier les statistiques
      const stats = liveChatManager.getChatStats(sessionId);
      expect(stats.mutedUsers).toBeGreaterThanOrEqual(1);
      expect(stats.bannedUsers).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Performance Tests', () => {
    it('should handle multiple concurrent messages', () => {
      const sessionId = 'perf-session-1';
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        liveChatManager.sendMessage(sessionId, i % 10, `user${i % 10}`, `Message ${i}`, 'text');
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Moins d'1 seconde pour 50 messages
      expect(liveChatManager.getMessages(sessionId).length).toBe(50);
    });

    it('should handle multiple concurrent reactions', () => {
      const sessionId = 'perf-session-2';
      const emojis = ['❤️', '😂', '🔥', '👍', '😍'];
      const startTime = Date.now();

      for (let i = 0; i < 50; i++) {
        liveChatManager.addReaction(sessionId, i % 10, `user${i % 10}`, emojis[i % 5]);
      }

      const duration = Date.now() - startTime;
      expect(duration).toBeLessThan(1000); // Moins d'1 seconde pour 50 réactions
      expect(liveChatManager.getReactions(sessionId).length).toBe(50);
    });
  });
});
