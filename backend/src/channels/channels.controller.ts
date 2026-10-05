import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import { CreateChannelDto } from './dto/create-channel.dto.js';
import { ChannelsService } from './channels.service.js';

@Controller('workspaces/:workspaceId/channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  create(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Body() dto: CreateChannelDto,
  ) {
    return this.channelsService.create(workspaceId, dto);
  }

  @Get()
  findAll(@Param('workspaceId', new ParseUUIDPipe()) workspaceId: string) {
    return this.channelsService.findAll(workspaceId);
  }

  @Get(':channelId')
  findOne(
    @Param('workspaceId', new ParseUUIDPipe()) workspaceId: string,
    @Param('channelId', new ParseUUIDPipe()) channelId: string,
  ) {
    return this.channelsService.findOne(workspaceId, channelId);
  }
}
