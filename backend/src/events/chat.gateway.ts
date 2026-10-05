import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
  WsException,
} from '@nestjs/websockets';
import { HttpException, Logger } from '@nestjs/common';
import { isUUID } from 'class-validator';
import type { Server, Socket } from 'socket.io';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { WsJwtAuthMiddleware } from './ws-jwt-auth.middleware.js';
import { MessagesService } from '../messages/messages.service.js';

interface ChannelPayload {
  workspaceId: string;
  channelId: string;
}

interface LeaveChannelPayload {
  channelId: string;
}

interface SendMessagePayload extends ChannelPayload {
  content: string;
}

@WebSocketGateway()
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private server!: Server;

  private readonly logger = new Logger(ChatGateway.name);

  constructor(
    private readonly wsJwtAuthMiddleware: WsJwtAuthMiddleware,
    private readonly messagesService: MessagesService,
  ) {}

  afterInit(server: Server) {
    server.use((client, next) => {
      void this.wsJwtAuthMiddleware.use(client, next);
    });
  }

  handleConnection(client: Socket) {
    this.logger.debug(`Socket connected: ${client.id}`);
  }

  handleDisconnect(client: Socket) {
    this.logger.debug(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join_channel')
  async joinChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    if (!this.isChannelPayload(payload)) {
      throw new WsException('workspaceId and channelId must be UUIDs');
    }

    const user = this.getAuthenticatedUser(client);
    try {
      await this.messagesService.assertChannelAccess(
        payload.workspaceId,
        payload.channelId,
        user.userId,
      );
    } catch (error) {
      this.rethrowAsWsException(error);
    }

    await client.join(this.getRoomName(payload.channelId));
    client.emit('joined_channel', {
      workspaceId: payload.workspaceId,
      channelId: payload.channelId,
    });
  }

  @SubscribeMessage('leave_channel')
  async leaveChannel(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    if (!this.isLeaveChannelPayload(payload)) {
      throw new WsException('channelId must be a UUID');
    }

    await client.leave(this.getRoomName(payload.channelId));
    client.emit('left_channel', { channelId: payload.channelId });
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: unknown,
  ) {
    if (!this.isSendMessagePayload(payload)) {
      throw new WsException('Invalid message payload');
    }

    const user = this.getAuthenticatedUser(client);
    const roomName = this.getRoomName(payload.channelId);
    if (!client.rooms.has(roomName)) {
      throw new WsException('Join the channel before sending messages');
    }

    try {
      const message = await this.messagesService.create(
        payload.workspaceId,
        payload.channelId,
        user.userId,
        { content: payload.content },
      );

      this.server.to(roomName).emit('newMessage', message);
    } catch (error) {
      this.rethrowAsWsException(error);
    }
  }

  private getAuthenticatedUser(client: Socket): AuthenticatedUser {
    const user = client.data.user as AuthenticatedUser | undefined;
    if (!user || typeof user.userId !== 'string') {
      throw new WsException('Unauthorized');
    }
    return user;
  }

  private isChannelPayload(payload: unknown): payload is ChannelPayload {
    if (typeof payload !== 'object' || payload === null) return false;
    const value = payload as Record<string, unknown>;
    return (
      typeof value.workspaceId === 'string' &&
      isUUID(value.workspaceId) &&
      typeof value.channelId === 'string' &&
      isUUID(value.channelId)
    );
  }

  private isLeaveChannelPayload(
    payload: unknown,
  ): payload is LeaveChannelPayload {
    if (typeof payload !== 'object' || payload === null) return false;
    const value = payload as Record<string, unknown>;
    return typeof value.channelId === 'string' && isUUID(value.channelId);
  }

  private isSendMessagePayload(payload: unknown): payload is SendMessagePayload {
    if (!this.isChannelPayload(payload)) return false;
    const content = 'content' in payload ? payload.content : undefined;
    return (
      typeof content === 'string' &&
      content.trim().length > 0 &&
      content.length <= 10000
    );
  }

  private getRoomName(channelId: string): string {
    return `channel:${channelId}`;
  }

  private rethrowAsWsException(error: unknown): never {
    if (error instanceof HttpException) {
      throw new WsException({
        status: error.getStatus(),
        message: error.message,
      });
    }
    throw error;
  }
}
