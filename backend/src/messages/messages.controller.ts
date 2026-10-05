import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto.js';
import { MessagesService } from './messages.service.js';

@Controller('workspaces/:workspaceId/channels/:channelId/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(private readonly messagesService: MessagesService) {}

  @Post()
  create(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @GetUser() user: AuthenticatedUser,
    @Body() dto: CreateMessageDto,
  ) {
    return this.messagesService.create(
      workspaceId,
      channelId,
      user.userId,
      dto,
    );
  }

  @Get()
  findAll(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @GetUser() user: AuthenticatedUser,
    @Query() query: GetMessagesQueryDto,
  ) {
    return this.messagesService.findAll(
      workspaceId,
      channelId,
      user.userId,
      query,
    );
  }
}
