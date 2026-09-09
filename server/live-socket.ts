import type { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import { parse as parseCookie } from "cookie";
import { getUserById } from "./db";
import { getLiveSessionsManager } from "./live-sessions";
import { getLiveStageRequestManager } from "./live/stage-requests";

interface LiveSocketJoinPayload { sessionId: string; }
interface LiveSocketUser { sessionId: string; userId: number; username: string; role: "host" | "admin" | "viewer" | "guest"; }
const socketUsers = new Map<string, LiveSocketUser>();
const manager = getLiveSessionsManager();
const stageRequests = getLiveStageRequestManager();
const LIVE_LAYOUTS = new Set(["spotlight", "split", "grid", "focus", "host-center"]);

const EVENT_LIMITS: Record<string, { max: number; windowMs: number }> = {
  "live:join": { max: 10, windowMs: 60_000 },
  "live:layout": { max: 30, windowMs: 60_000 },
  "live:stage-request": { max: 5, windowMs: 60_000 },
  "live:stage-decision": { max: 30, windowMs: 60_000 },
  "live:stage-media-ready": { max: 30, windowMs: 60_000 },
  "live:signal": { max: 120, windowMs: 60_000 },
  "live:chat": { max: 30, windowMs: 60_000 },
  "live:gift": { max: 60, windowMs: 60_000 },
  "live:status": { max: 60, windowMs: 60_000 },
  "live:moderate": { max: 30, windowMs: 60_000 },
};
const eventCounters = new Map<string, { count: number; resetAt: number }>();
const MAX_EVENT_COUNTERS = 10_000;
const MAX_SIGNAL_BYTES = 32 * 1024;
const MAX_GIFT_BYTES = 8 * 1024;

function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET?.trim();
  if (!secret || secret.length < 32) throw new Error("JWT_SECRET is not configured with sufficient entropy");
  return secret;
}

function allowEvent(socketId: string, eventName: string): boolean {
  const limit = EVENT_LIMITS[eventName];
  if (!limit) return true;
  const now = Date.now();
  const key = `${socketId}:${eventName}`;
  const current = eventCounters.get(key);
  if (!current || current.resetAt <= now) {
    if (!current && eventCounters.size >= MAX_EVENT_COUNTERS) return false;
    eventCounters.set(key, { count: 1, resetAt: now + limit.windowMs });
    return true;
  }
  if (current.count >= limit.max) return false;
  current.count += 1;
  return true;
}

function safeJsonBytes(value: unknown, maxBytes: number): boolean {
  try {
    return Buffer.byteLength(JSON.stringify(value), "utf8") <= maxBytes;
  } catch {
    return false;
  }
}

async function authenticateSocket(socket: Socket) {
  const rawCookie = socket.handshake.headers.cookie;
  if (!rawCookie) return null;
  const token = parseCookie(rawCookie).app_session_id;
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, getJwtSecret(), { algorithms: ["HS256"] }) as jwt.JwtPayload & { userId?: number };
    if (!Number.isInteger(decoded.userId) || (decoded.userId as number) <= 0) return null;
    return await getUserById(decoded.userId as number);
  } catch {
    return null;
  }
}

function participantPayload(sessionId: string) {
  const session = manager.getSession(sessionId);
  return session
    ? Array.from(session.participants.values()).map((p) => ({ userId: p.userId, username: p.username, role: p.role, isMuted: p.isMuted, isVideoOff: p.isVideoOff, stageSlot: p.stageSlot }))
    : [];
}

export function registerLiveSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    let authenticatedUser: { id: number; name?: string | null; username?: string | null } | null = null;
    let ready = false;

    void authenticateSocket(socket).then((user) => {
      if (!user) {
        socket.disconnect(true);
        return;
      }
      authenticatedUser = user;
      ready = true;
    }).catch(() => socket.disconnect(true));

    socket.on("live:join", (payload: LiveSocketJoinPayload) => {
      if (!allowEvent(socket.id, "live:join")) return;
      if (!ready || !authenticatedUser || !payload?.sessionId || typeof payload.sessionId !== "string" || payload.sessionId.length > 128) return;
      const session = manager.getSession(payload.sessionId);
      if (!session || session.state === "ended") return;

      const userId = authenticatedUser.id;
      const username = (authenticatedUser.name || authenticatedUser.username || `User ${userId}`).toString().slice(0, 100);
      const participant = session.participants.get(userId);

      if (!participant && !session.isPublic) return;
      if (!participant) manager.addParticipant(payload.sessionId, userId, username, "viewer");

      const currentParticipant = session.participants.get(userId);
      if (!currentParticipant) return;
      const effectiveRole = session.hostId === userId ? "host" : currentParticipant.role;
      socket.join(`live:${payload.sessionId}`);
      socketUsers.set(socket.id, { sessionId: payload.sessionId, userId, username: currentParticipant.username, role: effectiveRole });

      if (effectiveRole === "viewer") {
        io.to(`live:${payload.sessionId}`).emit("live:viewer-count", { delta: 1, userId, username: currentParticipant.username });
        io.to(`live:${payload.sessionId}`).emit("live:viewer-joined", { socketId: socket.id, userId, username: currentParticipant.username });
      }
      io.to(`live:${payload.sessionId}`).emit("live:participants", { participants: participantPayload(payload.sessionId) });
      socket.emit("live:layout", { layout: session.layout, centerParticipantId: session.centerParticipantId || session.hostId });
      if (session.hostId === userId || currentParticipant.role === "admin") socket.emit("live:stage-requests", { requests: stageRequests.listPending(payload.sessionId) });
      const ownRequest = stageRequests.listPending(payload.sessionId).find((r) => r.userId === userId);
      if (ownRequest) socket.emit("live:stage-request-state", { requestId: ownRequest.requestId, state: ownRequest.state, userId: ownRequest.userId });
    });

    socket.on("live:layout", ({ sessionId, layout, centerParticipantId }) => {
      if (!allowEvent(socket.id, "live:layout")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId || !LIVE_LAYOUTS.has(layout)) return;
      const session = manager.getSession(sessionId);
      if (!session || session.hostId !== sender.userId) return;
      session.layout = layout;
      if (centerParticipantId !== undefined) {
        const centerId = Number(centerParticipantId);
        if (Number.isSafeInteger(centerId) && centerId > 0) manager.setCenterParticipant(sessionId, centerId);
      }
      io.to(`live:${sessionId}`).emit("live:layout", { layout: session.layout, centerParticipantId: session.centerParticipantId || session.hostId });
    });

    socket.on("live:stage-request", ({ sessionId }) => {
      if (!allowEvent(socket.id, "live:stage-request")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId) return;
      const session = manager.getSession(sessionId);
      if (!session || session.hostId === sender.userId) return;
      if (!session.participants.has(sender.userId)) manager.addParticipant(sessionId, sender.userId, sender.username, "viewer");
      const request = stageRequests.request(sessionId, sender.userId, sender.username);
      io.to(`live:${sessionId}`).emit("live:stage-request", { requestId: request.requestId, userId: request.userId, username: request.username, createdAt: request.createdAt });
    });

    socket.on("live:stage-decision", ({ sessionId, requestId, decision }) => {
      if (!allowEvent(socket.id, "live:stage-decision")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId || !["accept", "reject"].includes(decision)) return;
      const session = manager.getSession(sessionId);
      if (!session) return;
      const senderParticipant = session.participants.get(sender.userId);
      if (session.hostId !== sender.userId && senderParticipant?.role !== "admin") return;
      const request = stageRequests.get(requestId);
      if (!request || request.sessionId !== sessionId) return;
      if (decision === "accept") {
        const stageCount = Array.from(session.participants.values()).filter((p) => p.role === "guest" || p.role === "admin").length;
        if (stageCount >= session.maxParticipants) { socket.emit("live:stage-error", { message: `La scène est pleine (${session.maxParticipants} places).` }); return; }
        if (!session.participants.has(request.userId)) manager.addParticipant(sessionId, request.userId, request.username, "viewer");
        if (!manager.setParticipantRole(sessionId, request.userId, "guest")) return;
      }
      const updated = stageRequests.setState(requestId, decision === "accept" ? "accepted" : "rejected");
      if (!updated) return;
      io.to(`live:${sessionId}`).emit("live:stage-request-state", { requestId, state: updated.state, userId: updated.userId });
      io.to(`live:${sessionId}`).emit("live:participants", { participants: participantPayload(sessionId) });
      const targetSocket = Array.from(socketUsers.entries()).find(([, u]) => u.sessionId === sessionId && u.userId === updated.userId)?.[0];
      if (decision === "accept" && targetSocket) io.to(targetSocket).emit("live:stage-updated", { userId: updated.userId, role: "guest" });
    });

    socket.on("live:stage-media-ready", ({ sessionId }) => {
      if (!allowEvent(socket.id, "live:stage-media-ready")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId) return;
      const session = manager.getSession(sessionId);
      const participant = session?.participants.get(sender.userId);
      if (!session || !participant || (participant.role !== "guest" && participant.role !== "admin" && participant.role !== "host")) return;
      const viewers = Array.from(socketUsers.entries()).filter(([, u]) => u.sessionId === sessionId && u.role === "viewer").map(([socketId]) => socketId);
      io.to(`live:${sessionId}`).emit("live:stage-media-ready", { socketId: socket.id, userId: sender.userId, stageSlot: participant.stageSlot, viewerSocketIds: viewers });
      if (viewers.length) io.to(socket.id).emit("live:stage-viewer-targets", { socketIds: viewers });
    });

    socket.on("live:signal", ({ to, signal }) => {
      if (!allowEvent(socket.id, "live:signal")) return;
      if (typeof to !== "string" || to.length < 1 || to.length > 128 || !signal || !safeJsonBytes(signal, MAX_SIGNAL_BYTES)) return;
      const sender = socketUsers.get(socket.id);
      const target = socketUsers.get(to);
      if (!sender || !target || sender.sessionId !== target.sessionId) return;
      io.to(to).emit("live:signal", { from: socket.id, userId: sender.userId, signal });
    });

    socket.on("live:chat", ({ sessionId, message }) => {
      if (!allowEvent(socket.id, "live:chat")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId || typeof message !== "string" || !message.trim()) return;
      io.to(`live:${sessionId}`).emit("live:chat", { id: `${Date.now()}_${socket.id}`, userId: sender.userId, username: sender.username, message: message.trim().slice(0, 300) });
    });

    socket.on("live:gift", ({ sessionId, gift }) => {
      if (!allowEvent(socket.id, "live:gift")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId || !gift || typeof gift !== "object" || !safeJsonBytes(gift, MAX_GIFT_BYTES)) return;
      io.to(`live:${sessionId}`).emit("live:gift", { ...gift, senderId: sender.userId, senderUsername: sender.username });
    });

    socket.on("live:status", ({ sessionId, isMuted, isVideoOff }) => {
      if (!allowEvent(socket.id, "live:status")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId) return;
      const safeMuted = Boolean(isMuted);
      const safeVideoOff = Boolean(isVideoOff);
      if (!manager.updateParticipantStatus(sessionId, sender.userId, safeMuted, safeVideoOff)) return;
      io.to(`live:${sessionId}`).emit("live:status", { userId: sender.userId, isMuted: safeMuted, isVideoOff: safeVideoOff });
    });

    socket.on("live:moderate", ({ sessionId, action, targetUserId, muted, role }) => {
      if (!allowEvent(socket.id, "live:moderate")) return;
      const sender = socketUsers.get(socket.id);
      if (!sender || typeof sessionId !== "string" || sessionId.length > 128 || sender.sessionId !== sessionId) return;
      const session = manager.getSession(sessionId);
      if (!session) return;
      const senderParticipant = session.participants.get(sender.userId);
      const canModerate = session.hostId === sender.userId || senderParticipant?.role === "admin";
      if (!canModerate || !Number.isSafeInteger(Number(targetUserId)) || Number(targetUserId) <= 0 || Number(targetUserId) === session.hostId) return;
      const targetId = Number(targetUserId);
      let ok = false;
      if (action === "mute") ok = manager.updateParticipantStatus(sessionId, targetId, Boolean(muted), undefined);
      else if (action === "stage") ok = manager.setParticipantRole(sessionId, targetId, role === "viewer" ? "viewer" : "guest");
      else if (action === "admin" && session.hostId === sender.userId) ok = manager.setParticipantRole(sessionId, targetId, "admin");
      else if (action === "remove") ok = manager.removeParticipant(sessionId, targetId);
      if (!ok) return;
      io.to(`live:${sessionId}`).emit("live:moderation", { action, targetUserId: targetId, muted: Boolean(muted), role: session.participants.get(targetId)?.role || "viewer", stageSlot: session.participants.get(targetId)?.stageSlot });
      io.to(`live:${sessionId}`).emit("live:participants", { participants: participantPayload(sessionId) });
    });

    socket.on("disconnect", () => {
      const user = socketUsers.get(socket.id);
      for (const key of eventCounters.keys()) {
        if (key.startsWith(`${socket.id}:`)) eventCounters.delete(key);
      }
      if (!user) return;
      if (user.role === "viewer") io.to(`live:${user.sessionId}`).emit("live:viewer-count", { delta: -1, userId: user.userId, username: user.username });
      io.to(`live:${user.sessionId}`).emit("live:user-left", { socketId: socket.id, userId: user.userId });
      socketUsers.delete(socket.id);
    });
  });
}
