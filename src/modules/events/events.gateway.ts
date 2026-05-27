import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { ApiKey, ApiKeyRole } from '../auth/entities/api-key.entity';
import { User } from '../auth/entities/user.entity';
import { Session } from '../session/entities/session.entity';
import type {
  WSClientMessage,
  WSSubscribeRequest,
  WSUnsubscribeRequest,
  WSSubscribedResponse,
  WSUnsubscribedResponse,
  WSEventMessage,
  WSErrorResponse,
  WSPongResponse,
} from './dto/ws-messages.dto';
import { SUBSCRIBABLE_EVENTS, buildRoomName } from './dto/ws-messages.dto';

type SocketPrincipal = { apiKey?: ApiKey; user?: User };

@WebSocketGateway({
  cors: {
    origin: '*', // In production, restrict this
  },
  namespace: '/events',
})
export class EventsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private logger = new Logger('EventsGateway');

  constructor(
    private readonly authService: AuthService,
    @InjectRepository(Session, 'data')
    private readonly sessionRepository: Repository<Session>,
  ) {}

  afterInit() {
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    const credentials = this.extractCredentials(client);

    if (!credentials) {
      this.logger.warn(`Client ${client.id} rejected: No credentials provided`);
      client.emit('message', this.createError('UNAUTHORIZED', 'User token or API key required'));
      client.disconnect();
      return;
    }

    try {
      if (credentials.type === 'user') {
        const user = await this.authService.validateUserToken(credentials.value);
        (client.data as SocketPrincipal).user = user;
        this.logger.log(`Client connected: ${client.id} (user: ${user.username})`);
      } else {
        const validKey = await this.authService.validateApiKey(credentials.value);
        (client.data as SocketPrincipal).apiKey = validKey;
        this.logger.log(`Client connected: ${client.id} (key: ${validKey.name})`);
      }
    } catch (error) {
      this.logger.warn(`Client ${client.id} rejected: Auth error`, {
        error: error instanceof Error ? error.message : String(error),
      });
      client.emit('message', this.createError('UNAUTHORIZED', 'Authentication failed'));
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('message')
  async handleMessage(@ConnectedSocket() client: Socket, @MessageBody() message: WSClientMessage) {
    switch (message.type) {
      case 'subscribe':
        return this.handleSubscribe(client, message);
      case 'unsubscribe':
        return this.handleUnsubscribe(client, message);
      case 'ping':
        return this.handlePing(client, message.requestId);
      default:
        return this.createError(
          'INVALID_MESSAGE',
          `Unknown message type`,
          (message as { requestId?: string }).requestId,
        );
    }
  }

  private async handleSubscribe(client: Socket, message: WSSubscribeRequest): Promise<WSSubscribedResponse | WSErrorResponse> {
    const { sessionId, events, requestId } = message;

    // Validate sessionId
    if (!sessionId || typeof sessionId !== 'string') {
      return this.createError('INVALID_SESSION', 'sessionId is required', requestId);
    }

    const canAccessSession = await this.canAccessSession(client, sessionId);
    if (!canAccessSession) {
      return this.createError('UNAUTHORIZED', 'Not authorized for this session', requestId);
    }

    // Validate events
    if (!events || !Array.isArray(events) || events.length === 0) {
      return this.createError('INVALID_EVENTS', 'events array is required', requestId);
    }

    // Validate each event type
    const validEvents = events.filter(
      e => e === '*' || SUBSCRIBABLE_EVENTS.includes(e as (typeof SUBSCRIBABLE_EVENTS)[number]),
    );
    if (validEvents.length === 0) {
      return this.createError(
        'INVALID_EVENTS',
        `No valid events. Valid: ${SUBSCRIBABLE_EVENTS.join(', ')}, *`,
        requestId,
      );
    }

    // Join rooms for each session/event combination
    const rooms: string[] = [];
    for (const event of validEvents) {
      const room = buildRoomName(sessionId, event);
      void client.join(room);
      rooms.push(room);
    }

    this.logger.debug(`Client ${client.id} subscribed to: ${rooms.join(', ')}`);

    return {
      type: 'subscribed',
      sessionId,
      events: validEvents,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  private handleUnsubscribe(client: Socket, message: WSUnsubscribeRequest): WSUnsubscribedResponse {
    const { sessionId, requestId } = message;

    // Leave all rooms for this session
    const clientRooms = Array.from(client.rooms);
    const sessionPrefix = `session:${sessionId}:`;

    for (const room of clientRooms) {
      if (room.startsWith(sessionPrefix) || (sessionId === '*' && room.startsWith('session:'))) {
        void client.leave(room);
      }
    }

    this.logger.debug(`Client ${client.id} unsubscribed from session: ${sessionId}`);

    return {
      type: 'unsubscribed',
      sessionId,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  private handlePing(_client: Socket, requestId?: string): WSPongResponse {
    return {
      type: 'pong',
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  private createError(code: string, message: string, requestId?: string): WSErrorResponse {
    return {
      type: 'error',
      code,
      message,
      requestId,
      timestamp: new Date().toISOString(),
    };
  }

  private extractCredentials(client: Socket): { type: 'apiKey' | 'user'; value: string } | undefined {
    const auth = client.handshake.auth as { apiKey?: string; token?: string } | undefined;
    const headerApiKey = client.handshake.headers['x-api-key'];
    const headerAuth = client.handshake.headers.authorization;
    const apiKey =
      auth?.apiKey ||
      (typeof headerApiKey === 'string' ? headerApiKey : undefined) ||
      (typeof client.handshake.query.apiKey === 'string' ? client.handshake.query.apiKey : undefined);

    if (apiKey) return { type: 'apiKey', value: apiKey };

    const bearerToken =
      auth?.token ||
      (typeof client.handshake.query.token === 'string' ? client.handshake.query.token : undefined) ||
      (typeof headerAuth === 'string' && headerAuth.toLowerCase().startsWith('bearer ')
        ? headerAuth.slice(7).trim()
        : undefined);

    if (!bearerToken) return undefined;
    return {
      type: bearerToken.startsWith('aeon_u1_') || bearerToken.startsWith('owa_u1_') ? 'user' : 'apiKey',
      value: bearerToken,
    };
  }

  private async canAccessSession(client: Socket, sessionId: string): Promise<boolean> {
    const principal = client.data as SocketPrincipal;

    if (principal.user) {
      if (principal.user.role === ApiKeyRole.ADMIN) return true;
      return !!(await this.sessionRepository.findOne({ where: { id: sessionId, ownerUserId: principal.user.id } }));
    }

    if (principal.apiKey) {
      if (principal.apiKey.allowedSessions?.length && !principal.apiKey.allowedSessions.includes(sessionId)) {
        return false;
      }
      if (!principal.apiKey.ownerUserId || principal.apiKey.role === ApiKeyRole.ADMIN) return true;
      return !!(await this.sessionRepository.findOne({
        where: { id: sessionId, ownerUserId: principal.apiKey.ownerUserId },
      }));
    }

    return false;
  }

  // ========== Event Emission Methods (room-based) ==========

  /**
   * Emit event to specific rooms based on sessionId and event type
   */
  private emitToRooms(sessionId: string, event: string, data: unknown): void {
    const eventMessage: WSEventMessage = {
      type: 'event',
      payload: { event, sessionId, data },
      timestamp: new Date().toISOString(),
    };

    // Emit to specific session + event room
    this.server.to(buildRoomName(sessionId, event)).emit('message', eventMessage);

    // Emit to wildcard rooms
    this.server.to(buildRoomName(sessionId, '*')).emit('message', eventMessage);
    this.server.to(buildRoomName('*', event)).emit('message', eventMessage);
    this.server.to(buildRoomName('*', '*')).emit('message', eventMessage);
  }

  /**
   * Emit session status change
   */
  emitSessionStatus(sessionId: string, status: string, data?: Record<string, unknown>) {
    this.emitToRooms(sessionId, 'session.status', { status, ...data });
  }

  /**
   * Emit QR code update for a session
   */
  emitQRCode(sessionId: string, qrCode: string) {
    this.emitToRooms(sessionId, 'session.qr', { qrCode });
  }

  /**
   * Emit new message notification
   */
  emitMessage(sessionId: string, message: Record<string, unknown>) {
    this.emitToRooms(sessionId, 'message.received', message);
  }

  /**
   * Emit message sent notification
   */
  emitMessageSent(sessionId: string, message: Record<string, unknown>) {
    this.emitToRooms(sessionId, 'message.sent', message);
  }

  /**
   * Emit message acknowledgment
   */
  emitMessageAck(sessionId: string, data: { messageId: string; ack: number; ackName: string }) {
    this.emitToRooms(sessionId, 'message.ack', data);
  }

  /**
   * Emit webhook delivery status (broadcast to all - no session context)
   */
  emitWebhookStatus(webhookId: string, success: boolean, error?: string) {
    // This one broadcasts to all since webhooks don't have session context in the same way
    this.server.emit('webhook:delivery', {
      webhookId,
      success,
      error,
      timestamp: new Date().toISOString(),
    });
  }
}
