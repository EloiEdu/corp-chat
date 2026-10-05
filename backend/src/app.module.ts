import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { AuthModule } from './auth/auth.module.js';
import { ChannelsModule } from './channels/channels.module.js';
import { EventsModule } from './events/events.module.js';
import { MessagesModule } from './messages/messages.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { UsersModule } from './users/users.module.js';
import { WorkspacesModule } from './workspaces/workspaces.module.js';

@Module({
  imports: [
    PrismaModule,
    UsersModule,
    WorkspacesModule,
    ChannelsModule,
    AuthModule,
    MessagesModule,
    EventsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
