/**
 * Système WebSocket pour Afritok
 * 
 * Gère la communication temps réel :
 * - Likes en direct
 * - Commentaires en direct
 * - Notifications en direct
 * - Présence utilisateur
 * - Messages directs
 */

import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import { getLogger } from './logging';

const logger = getLogger();

/**
 * Types d'événements WebSocket
 */
export enum WebSocketEventType {
  // Interactions vidéo
  VIDEO_LIKED = 'video:liked',
  VIDEO_UNLIKED = 'video:unliked',
  COMMENT_ADDED = 'comment:added',
  COMMENT_DELETED = 'comment:deleted',
  COMMENT_LIKED = 'comment:liked',
  
  // Suivis
  USER_FOLLOWED = 'user:followed',
  USER_UNFOLLOWED = 'user:unfollowed',
  
  // Notifications
  NOTIFICATION_SENT = 'notification:sent',
  NOTIFICATION_READ = 'notification:read',
  
  // Messages directs
  MESSAGE_SENT = 'message:sent',
  MESSAGE_READ = 'message:read',
  TYPING = 'typing:indicator',
  
  // Présence
  USER_ONLINE = 'user:online',
  USER_OFFLINE = 'user:offline',
  
  // Live streaming
  LIVE_STARTED = 'live:started',
  LIVE_ENDED = 'live:ended',
  LIVE_VIEWER_JOINED = 'live:viewer_joined',
  LIVE_VIEWER_LEFT = 'live:viewer_left',
  
  // Duets & Stitches
  DUET_CREATED = 'duet:created',
  STITCH_CREATED = 'stitch:created',
  
  // Cadeaux virtuels
  GIFT_RECEIVED = 'gift:received',
  
  // Trending
  VIDEO_TRENDING = 'video:trending',
  HASHTAG_TRENDING = 'hashtag:trending',
}

/**
 * Interface pour les événements WebSocket
 */
export interface WebSocketEvent {
  type: WebSocketEventType;
  userId?: number;
  data: Record<string, any>;
  timestamp: Date;
}

/**
 * Interface pour la connexion utilisateur
 */
export interface UserConnection {
  userId: number;
  socketId: string;
  connectedAt: Date;
  lastActivity: Date;
  isOnline: boolean;
}

/**
 * Classe pour gérer WebSocket
 */
export class WebSocketManager {
  private io: SocketIOServer;
  private userConnections: Map<number, UserConnection[]> = new Map();
  private userSockets: Map<string, number> = new Map(); // socketId -> userId
  private typingUsers: Map<string, Set<number>> = new Map(); // conversationId -> Set<userId>

  constructor(httpServer: HTTPServer) {
    this.io = new SocketIOServer(httpServer, {
      cors: {
        origin: process.env.APP_URL || 'http://localhost:3000',
        credentials: true,
      },
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 60000,
    });

    this.setupMiddleware();
    this.setupEventHandlers();
    this.setupCleanup();

    logger.info('WebSocket manager initialized');
  }

  /**
   * Configurer les middlewares
   */
  private setupMiddleware(): void {
    // Middleware d'authentification
    this.io.use((socket: Socket, next: any) => {
      const userId = socket.handshake.auth.userId as number;
      const token = socket.handshake.auth.token as string;

      if (!userId || !token) {
        return next(new Error('Authentication error'));
      }

      // TODO: Vérifier le token JWT
      (socket.data as any).userId = userId;
      next();
    });
  }

  /**
   * Configurer les gestionnaires d'événements
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const userId = socket.data.userId as number;

      logger.info(`User ${userId} connected via WebSocket`, {
        socketId: socket.id,
      });

      // Enregistrer la connexion
      this.registerUserConnection(userId, socket.id);

      // Événement de connexion
      this.broadcastEvent({
        type: WebSocketEventType.USER_ONLINE,
        userId,
        data: { userId },
        timestamp: new Date(),
      });

      // Événements de vidéo
      socket.on('video:like', (data: any) => this.handleVideoLike(socket, data));
      socket.on('video:unlike', (data: any) => this.handleVideoUnlike(socket, data));
      socket.on('comment:add', (data: any) => this.handleCommentAdd(socket, data));
      socket.on('comment:delete', (data: any) => this.handleCommentDelete(socket, data));

      // Événements de suivi
      socket.on('user:follow', (data: any) => this.handleUserFollow(socket, data));
      socket.on('user:unfollow', (data: any) => this.handleUserUnfollow(socket, data));

      // Événements de messages
      socket.on('message:send', (data: any) => this.handleMessageSend(socket, data));
      socket.on('message:read', (data: any) => this.handleMessageRead(socket, data));
      socket.on('typing:start', (data: any) => this.handleTypingStart(socket, data));
      socket.on('typing:stop', (data: any) => this.handleTypingStop(socket, data));

      // Événements de déconnexion
      socket.on('disconnect', () => this.handleDisconnect(socket, userId));
    });
  }

  /**
   * Configurer le nettoyage automatique
   */
  private setupCleanup(): void {
    // Nettoyer les connexions inactives toutes les 5 minutes
    setInterval(() => {
      const now = new Date();
      const timeout = 5 * 60 * 1000; // 5 minutes

      this.userConnections.forEach((connections, userId) => {
        const activeConnections = connections.filter(
          (conn) => now.getTime() - conn.lastActivity.getTime() < timeout
        );

        if (activeConnections.length === 0) {
          this.userConnections.delete(userId);
        } else {
          this.userConnections.set(userId, activeConnections);
        }
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Enregistrer une connexion utilisateur
   */
  private registerUserConnection(userId: number, socketId: string): void {
    const connection: UserConnection = {
      userId,
      socketId,
      connectedAt: new Date(),
      lastActivity: new Date(),
      isOnline: true,
    };

    const connections = this.userConnections.get(userId) || [];
    connections.push(connection);
    this.userConnections.set(userId, connections);
    this.userSockets.set(socketId, userId);
  }

  /**
   * Gérer le like vidéo
   */
  private handleVideoLike(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { videoId, creatorId } = data;

    logger.info('Video liked', { userId, videoId });

    // Envoyer l'événement au créateur
    this.sendToUser(creatorId, WebSocketEventType.VIDEO_LIKED, {
      videoId,
      userId,
      likerName: 'User', // TODO: Récupérer le nom réel
    });

    // Diffuser l'événement
    this.broadcastEvent({
      type: WebSocketEventType.VIDEO_LIKED,
      userId,
      data: { videoId, userId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer le unlike vidéo
   */
  private handleVideoUnlike(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { videoId } = data;

    logger.info('Video unliked', { userId, videoId });

    this.broadcastEvent({
      type: WebSocketEventType.VIDEO_UNLIKED,
      userId,
      data: { videoId, userId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer l'ajout de commentaire
   */
  private handleCommentAdd(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { videoId, commentId, content } = data;

    logger.info('Comment added', { userId, videoId, commentId });

    this.broadcastEvent({
      type: WebSocketEventType.COMMENT_ADDED,
      userId,
      data: { videoId, commentId, content, userId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer la suppression de commentaire
   */
  private handleCommentDelete(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { videoId, commentId } = data;

    logger.info('Comment deleted', { userId, videoId, commentId });

    this.broadcastEvent({
      type: WebSocketEventType.COMMENT_DELETED,
      userId,
      data: { videoId, commentId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer le suivi d'utilisateur
   */
  private handleUserFollow(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { followingId } = data;

    logger.info('User followed', { userId, followingId });

    // Notifier l'utilisateur suivi
    this.sendToUser(followingId, WebSocketEventType.USER_FOLLOWED, {
      userId,
      followingId,
    });

    this.broadcastEvent({
      type: WebSocketEventType.USER_FOLLOWED,
      userId,
      data: { userId, followingId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer l'arrêt du suivi
   */
  private handleUserUnfollow(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { followingId } = data;

    logger.info('User unfollowed', { userId, followingId });

    this.broadcastEvent({
      type: WebSocketEventType.USER_UNFOLLOWED,
      userId,
      data: { userId, followingId },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer l'envoi de message
   */
  private handleMessageSend(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { recipientId, messageId, content } = data;

    logger.info('Message sent', { userId, recipientId, messageId });

    // Envoyer le message au destinataire
    this.sendToUser(recipientId, WebSocketEventType.MESSAGE_SENT, {
      messageId,
      senderId: userId,
      content,
      sentAt: new Date(),
    });
  }

  /**
   * Gérer la lecture de message
   */
  private handleMessageRead(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { messageId, senderId } = data;

    logger.info('Message read', { userId, messageId });

    // Notifier l'expéditeur
    this.sendToUser(senderId, WebSocketEventType.MESSAGE_READ, {
      messageId,
      readBy: userId,
      readAt: new Date(),
    });
  }

  /**
   * Gérer le début de la saisie
   */
  private handleTypingStart(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { conversationId } = data;

    const typingSet = this.typingUsers.get(conversationId) || new Set();
    typingSet.add(userId);
    this.typingUsers.set(conversationId, typingSet);

    this.broadcastEvent({
      type: WebSocketEventType.TYPING,
      userId,
      data: { conversationId, typingUsers: Array.from(typingSet) },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer l'arrêt de la saisie
   */
  private handleTypingStop(socket: Socket, data: any): void {
    const userId = socket.data.userId as number;
    const { conversationId } = data;

    const typingSet = this.typingUsers.get(conversationId) || new Set();
    typingSet.delete(userId);

    if (typingSet.size === 0) {
      this.typingUsers.delete(conversationId);
    } else {
      this.typingUsers.set(conversationId, typingSet);
    }

    this.broadcastEvent({
      type: WebSocketEventType.TYPING,
      userId,
      data: { conversationId, typingUsers: Array.from(typingSet) },
      timestamp: new Date(),
    });
  }

  /**
   * Gérer la déconnexion
   */
  private handleDisconnect(socket: Socket, userId: number): void {
    logger.info(`User ${userId} disconnected`, { socketId: socket.id });

    // Retirer la connexion
    const connections = this.userConnections.get(userId) || [];
    const remaining = connections.filter((conn) => conn.socketId !== socket.id);

    if (remaining.length === 0) {
      this.userConnections.delete(userId);

      // Diffuser l'événement de déconnexion
      this.broadcastEvent({
        type: WebSocketEventType.USER_OFFLINE,
        userId,
        data: { userId },
        timestamp: new Date(),
      });
    } else {
      this.userConnections.set(userId, remaining);
    }

    this.userSockets.delete(socket.id);
  }

  /**
   * Envoyer un événement à un utilisateur spécifique
   */
  public sendToUser(userId: number, eventType: WebSocketEventType | string, data: any): void {
    const connections = this.userConnections.get(userId);

    if (!connections || connections.length === 0) {
      logger.debug(`User ${userId} not connected`, { eventType });
      return;
    }

    connections.forEach((connection) => {
      this.io.to(connection.socketId).emit(eventType, {
        type: eventType,
        data,
        timestamp: new Date(),
      });
    });

    logger.debug(`Event sent to user ${userId}`, { eventType, connectionCount: connections.length });
  }

  /**
   * Diffuser un événement à tous les utilisateurs connectés
   */
  public broadcastEvent(event: WebSocketEvent): void {
    this.io.emit(event.type, {
      type: event.type,
      data: event.data,
      timestamp: event.timestamp,
    });

    logger.debug(`Event broadcasted`, { eventType: event.type });
  }

  /**
   * Envoyer un événement à une salle (ex: viewers d'une vidéo)
   */
  public sendToRoom(roomId: string, eventType: WebSocketEventType | string, data: any): void {
    this.io.to(roomId).emit(eventType, {
      type: eventType,
      data,
      timestamp: new Date(),
    });

    logger.debug(`Event sent to room ${roomId}`, { eventType });
  }

  /**
   * Joindre une salle
   */
  public joinRoom(socketId: string, roomId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.join(roomId);
      logger.debug(`Socket ${socketId} joined room ${roomId}`);
    }
  }

  /**
   * Quitter une salle
   */
  public leaveRoom(socketId: string, roomId: string): void {
    const socket = this.io.sockets.sockets.get(socketId);
    if (socket) {
      socket.leave(roomId);
      logger.debug(`Socket ${socketId} left room ${roomId}`);
    }
  }

  /**
   * Obtenir le nombre d'utilisateurs connectés
   */
  public getConnectedUsersCount(): number {
    return this.userConnections.size;
  }

  /**
   * Obtenir les utilisateurs connectés
   */
  public getConnectedUsers(): number[] {
    return Array.from(this.userConnections.keys());
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  public isUserOnline(userId: number): boolean {
    return this.userConnections.has(userId);
  }

  /**
   * Obtenir le serveur Socket.IO
   */
  public getIO(): SocketIOServer {
    return this.io;
  }
}

/**
 * Instance singleton
 */
let wsManager: WebSocketManager | null = null;

/**
 * Initialiser le gestionnaire WebSocket
 */
export function initializeWebSocket(httpServer: HTTPServer): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(httpServer);
  }
  return wsManager;
}

/**
 * Obtenir l'instance WebSocket
 */
export function getWebSocketManager(): WebSocketManager {
  if (!wsManager) {
    throw new Error('WebSocket manager not initialized');
  }
  return wsManager;
}
