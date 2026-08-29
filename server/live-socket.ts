import type { Server, Socket } from "socket.io";
import { getLiveSessionsManager } from "./live-sessions";

interface LiveSocketUser { sessionId: string; userId: number; username: string; role: "host" | "admin" | "viewer" | "guest"; }
const socketUsers = new Map<string, LiveSocketUser>();
const manager = getLiveSessionsManager();

export function registerLiveSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("live:join", (user: LiveSocketUser) => {
      if (!user?.sessionId || !Number.isInteger(user.userId) || !user.username) return;
      const session = manager.getSession(user.sessionId); if (!session) return;
      const participant = session.participants.get(user.userId);
      const effectiveRole = participant?.role || user.role;
      socket.join(`live:${user.sessionId}`);
      socketUsers.set(socket.id, { ...user, role: effectiveRole });
      if (effectiveRole === "viewer") {
        io.to(`live:${user.sessionId}`).emit("live:viewer-count", { delta: 1, userId: user.userId, username: user.username });
        io.to(`live:${user.sessionId}`).emit("live:viewer-joined", { socketId: socket.id, userId: user.userId, username: user.username });
      }
      io.to(`live:${user.sessionId}`).emit("live:participants", { participants: Array.from(session.participants.values()).map((p) => ({ userId: p.userId, username: p.username, role: p.role, isMuted: p.isMuted, isVideoOff: p.isVideoOff })) });
    });

    socket.on("live:signal", ({ to, signal }) => { if (!to || !signal || !socketUsers.has(socket.id)) return; io.to(to).emit("live:signal", { from: socket.id, signal }); });
    socket.on("live:chat", ({ sessionId, message }) => { const sender = socketUsers.get(socket.id); if (!sender || sender.sessionId !== sessionId || !message?.trim()) return; io.to(`live:${sessionId}`).emit("live:chat", { id: `${Date.now()}_${socket.id}`, userId: sender.userId, username: sender.username, message: message.trim().slice(0, 300) }); });
    socket.on("live:gift", ({ sessionId, gift }) => { const sender = socketUsers.get(socket.id); if (!sender || sender.sessionId !== sessionId || !gift) return; io.to(`live:${sessionId}`).emit("live:gift", { ...gift, senderId: sender.userId, senderUsername: sender.username }); });
    socket.on("live:status", ({ sessionId, isMuted, isVideoOff }) => { const sender = socketUsers.get(socket.id); if (!sender || sender.sessionId !== sessionId) return; manager.updateParticipantStatus(sessionId, sender.userId, isMuted, isVideoOff); io.to(`live:${sessionId}`).emit("live:status", { userId: sender.userId, isMuted, isVideoOff }); });

    // The host/admin command channel is deliberately server-authorized as well as UI-authorized.
    socket.on("live:moderate", ({ sessionId, action, targetUserId, muted, role }) => {
      const sender = socketUsers.get(socket.id); if (!sender || sender.sessionId !== sessionId) return;
      const session = manager.getSession(sessionId); if (!session) return;
      const senderParticipant = session.participants.get(sender.userId);
      const canModerate = session.hostId === sender.userId || senderParticipant?.role === "admin";
      if (!canModerate || targetUserId === session.hostId) return;
      let ok = false;
      if (action === "mute") ok = manager.updateParticipantStatus(sessionId, targetUserId, Boolean(muted), undefined);
      else if (action === "stage") ok = manager.setParticipantRole(sessionId, targetUserId, role === "viewer" ? "viewer" : "guest");
      else if (action === "admin" && session.hostId === sender.userId) ok = manager.setParticipantRole(sessionId, targetUserId, "admin");
      else if (action === "remove") ok = manager.removeParticipant(sessionId, targetUserId);
      if (!ok) return;
      io.to(`live:${sessionId}`).emit("live:moderation", { action, targetUserId, muted: Boolean(muted), role: session.participants.get(targetUserId)?.role || "viewer" });
      io.to(`live:${sessionId}`).emit("live:participants", { participants: Array.from(session.participants.values()).map((p) => ({ userId: p.userId, username: p.username, role: p.role, isMuted: p.isMuted, isVideoOff: p.isVideoOff })) });
    });

    socket.on("disconnect", () => {
      const user = socketUsers.get(socket.id); if (!user) return;
      if (user.role === "viewer") io.to(`live:${user.sessionId}`).emit("live:viewer-count", { delta: -1, userId: user.userId, username: user.username });
      io.to(`live:${user.sessionId}`).emit("live:user-left", { socketId: socket.id, userId: user.userId });
      socketUsers.delete(socket.id);
    });
  });
}
