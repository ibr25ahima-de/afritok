import type { Server, Socket } from "socket.io";

interface LiveSocketUser {
  sessionId: string;
  userId: number;
  username: string;
  role: "host" | "viewer" | "guest";
}

const socketUsers = new Map<string, LiveSocketUser>();

export function registerLiveSocket(io: Server) {
  io.on("connection", (socket: Socket) => {
    socket.on("live:join", (user: LiveSocketUser) => {
      if (!user?.sessionId || !Number.isInteger(user.userId) || !user.username) return;
      socket.join(`live:${user.sessionId}`);
      socketUsers.set(socket.id, user);
      if (user.role === "viewer") {
        io.to(`live:${user.sessionId}`).emit("live:viewer-count", { delta: 1, userId: user.userId, username: user.username });
        io.to(`live:${user.sessionId}`).emit("live:viewer-joined", { socketId: socket.id, userId: user.userId, username: user.username });
      }
    });

    socket.on("live:signal", ({ to, signal }) => {
      if (!to || !signal || !socketUsers.has(socket.id)) return;
      io.to(to).emit("live:signal", { from: socket.id, signal });
    });

    socket.on("live:gift", ({ sessionId, gift }) => {
      const sender = socketUsers.get(socket.id);
      if (!sender || sender.sessionId !== sessionId || !gift) return;
      io.to(`live:${sessionId}`).emit("live:gift", { ...gift, senderId: sender.userId, senderUsername: sender.username });
    });

    socket.on("live:status", ({ sessionId, isMuted, isVideoOff }) => {
      const sender = socketUsers.get(socket.id);
      if (!sender || sender.sessionId !== sessionId) return;
      io.to(`live:${sessionId}`).emit("live:status", { userId: sender.userId, isMuted, isVideoOff });
    });

    socket.on("disconnect", () => {
      const user = socketUsers.get(socket.id);
      if (!user) return;
      if (user.role === "viewer") io.to(`live:${user.sessionId}`).emit("live:viewer-count", { delta: -1, userId: user.userId, username: user.username });
      io.to(`live:${user.sessionId}`).emit("live:user-left", { socketId: socket.id, userId: user.userId });
      socketUsers.delete(socket.id);
    });
  });
}
