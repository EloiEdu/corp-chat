import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto.js';
import { ChannelsService } from './channels.service.js';
import { GetUser } from '../auth/decorators/get-user.decorator.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import type { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface.js';

@Controller('workspaces/:workspaceId/channels')
@UseGuards(JwtAuthGuard)
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: CreateChannelDto,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.channelsService.create(workspaceId, dto, user.userId);
  }

  @Get()
  findAll(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.channelsService.findAll(workspaceId, user.userId);
  }

  @Get(':channelId')
  findOne(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @GetUser() user: AuthenticatedUser,
  ) {
    return this.channelsService.findOne(workspaceId, channelId, user.userId);
  }

  @Delete(':channelId')
  remove(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
    @GetUser() user: AuthenticatedUser,
  ){
    return this.channelsService.remove(workspaceId, channelId, user.userId);
  }
}
