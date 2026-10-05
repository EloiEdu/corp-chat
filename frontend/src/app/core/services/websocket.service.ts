import { computed, inject, Injectable, signal } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import type { Message } from '../../models/message.model';
import { environment } from '../../../environments/environment';

interface ChannelRoomPayload {
  workspaceId: string;
  channelId: string;
}

interface SendMessagePayload extends ChannelRoomPayload {
  content: string;
}

@Injectable({ providedIn: 'root' })
export class WebsocketService {
  private readonly authService = inject(AuthService);
  private readonly connectionState = signal(false);
  private readonly lastMessageState = signal<Message | null>(null);

  readonly isConnected = computed(() => this.connectionState());
  readonly lastMessage = computed(() => this.lastMessageState());

  private readonly socket: Socket = io(environment.apiUrl, {
    autoConnect: false,
    auth: (callback) => {
      callback({ token: this.authService.getAccessToken() });
    },
  });

  constructor() {
    this.socket.on('connect', () => {
      this.connectionState.set(true);
      console.info('[Socket.io] Conectado:', this.socket.id);
    });

    this.socket.on('disconnect', (reason) => {
      this.connectionState.set(false);
      console.info('[Socket.io] Desconectado:', reason);
    });

    this.socket.on('connect_error', (error: Error) => {
      this.connectionState.set(false);
      console.error('[Socket.io] Falha na conexão:', error.message);
    });

    this.socket.on('newMessage', (message: Message) => {
      this.lastMessageState.set(message);
    });
  }

  connect(): void {
    if (!this.authService.getAccessToken()) {
      console.warn('[Socket.io] Conexão não iniciada: token JWT ausente.');
      return;
    }

    if (!this.socket.connected) {
      this.socket.connect();
    }
  }

  disconnect(): void {
    this.socket.disconnect();
    this.connectionState.set(false);
  }

  joinChannel(workspaceId: string, channelId: string): void {
    if (!this.requireConnection()) return;

    const payload: ChannelRoomPayload = { workspaceId, channelId };
    this.socket.emit('join_channel', payload);
  }

  leaveChannel(channelId: string): void {
    if (!this.requireConnection()) return;

    this.socket.emit('leave_channel', { channelId });
  }

  sendMessage(
    workspaceId: string,
    channelId: string,
    content: string,
  ): void {
    if (!this.requireConnection()) return;

    const payload: SendMessagePayload = {
      workspaceId,
      channelId,
      content,
    };
    this.socket.emit('send_message', payload);
  }

  private requireConnection(): boolean {
    if (this.socket.connected) return true;

    console.warn('[Socket.io] Evento não enviado: socket desconectado.');
    return false;
  }
}
