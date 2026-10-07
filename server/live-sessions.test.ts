import { describe, expect, it } from 'vitest';
import { LiveSessionsManager } from './live-sessions';

describe('LiveSessionsManager', () => {
  it('creates a host and enforces the configured stage capacity', () => {
    const manager = new LiveSessionsManager();
    const session = manager.createSession(1, 'host', 'Production Live', '', 'video', true, 2);

    expect(session.maxParticipants).toBe(2);
    expect(session.participants.get(1)?.role).toBe('host');
    expect(manager.addParticipant(session.sessionId, 2, 'guest-1', 'guest')).toBe(true);
    expect(manager.addParticipant(session.sessionId, 3, 'guest-2', 'guest')).toBe(true);
    expect(manager.addParticipant(session.sessionId, 4, 'guest-3', 'guest')).toBe(false);
  });

  it('keeps viewer count separate from stage participants', () => {
    const manager = new LiveSessionsManager();
    const session = manager.createSession(10, 'host', 'Live', '', 'video', true, 2);

    expect(manager.addParticipant(session.sessionId, 20, 'viewer', 'viewer')).toBe(true);
    expect(session.viewerCount).toBe(1);

    expect(manager.setParticipantRole(session.sessionId, 20, 'guest')).toBe(true);
    expect(session.viewerCount).toBe(0);
    expect(session.participants.get(20)?.role).toBe('guest');
  });

  it('does not allow a caller to change the host role', () => {
    const manager = new LiveSessionsManager();
    const session = manager.createSession(100, 'host', 'Live', '', 'video', true, 5);

    expect(manager.setParticipantRole(session.sessionId, 100, 'admin')).toBe(false);
    expect(manager.setGuestLiveState(session.sessionId, 100, true, true)).toBe(false);
    expect(session.participants.get(100)?.role).toBe('host');
  });

  it('rejects a second active Live session for the same host', () => {
    const manager = new LiveSessionsManager();
    manager.createSession(42, 'host', 'First Live', '', 'video', true, 5);

    expect(() => manager.createSession(42, 'host', 'Second Live', '', 'video', true, 5)).toThrow('Host already has an active Live session');
  });

  it('allows a host to create a new Live after closing the previous one', () => {
    const manager = new LiveSessionsManager();
    const first = manager.createSession(43, 'host', 'First Live', '', 'video', true, 5);
    manager.closeSession(first.sessionId);

    const second = manager.createSession(43, 'host', 'Second Live', '', 'video', true, 5);
    expect(second.sessionId).not.toBe(first.sessionId);
    expect(manager.getUserSession(43)?.sessionId).toBe(second.sessionId);
  });

  it('closes a session and clears user-session mappings', () => {
    const manager = new LiveSessionsManager();
    const session = manager.createSession(7, 'host', 'Live', '', 'video', true, 5);
    manager.addParticipant(session.sessionId, 8, 'viewer', 'viewer');

    manager.closeSession(session.sessionId);

    expect(manager.getUserSession(7)).toBeUndefined();
    expect(manager.getUserSession(8)).toBeUndefined();
    expect(manager.getSession(session.sessionId)?.state).toBe('ended');
  });
});

