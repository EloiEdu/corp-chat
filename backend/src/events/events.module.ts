import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { MessagesModule } from '../messages/messages.module.js';
import { ChatGateway } from './chat.gateway.js';
import { WsJwtAuthMiddleware } from './ws-jwt-auth.middleware.js';

@Module({
  imports: [AuthModule, MessagesModule],
  providers: [ChatGateway, WsJwtAuthMiddleware],
})
export class EventsModule {}
