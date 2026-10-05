import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateMessageDto } from './dto/create-message.dto.js';
import { GetMessagesQueryDto } from './dto/get-messages-query.dto.js';

@Injectable()
export class MessagesService {
  constructor(private readonly prisma: PrismaService) {}

  async assertChannelAccess(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    await this.ensureChannelAccess(workspaceId, channelId, userId);
  }

  async create(
    workspaceId: string,
    channelId: string,
    userId: string,
    dto: CreateMessageDto,
  ) {
    await this.ensureChannelAccess(workspaceId, channelId, userId);

    return this.prisma.message.create({
      data: {
        content: dto.content.trim(),
        channelId,
        senderId: userId,
      },
    });
  }

  async findAll(
    workspaceId: string,
    channelId: string,
    userId: string,
    query: GetMessagesQueryDto,
  ) {
    await this.ensureChannelAccess(workspaceId, channelId, userId);

    if (query.cursor) {
      const cursorMessage = await this.prisma.message.findFirst({
        where: { id: query.cursor, channelId },
        select: { id: true },
      });

      if (!cursorMessage) {
        throw new NotFoundException('Cursor message not found in this channel');
      }
    }

    const fetchedMessages = await this.prisma.message.findMany({
      where: { channelId },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      ...(query.cursor
        ? { cursor: { id: query.cursor }, skip: 1 }
        : {}),
      take: query.limit + 1,
      include: {
        sender: {
          select: { id: true, fullName: true, avatarUrl: true },
        },
      },
    });

    const hasMore = fetchedMessages.length > query.limit;
    const data = fetchedMessages.slice(0, query.limit);

    return {
      data,
      hasMore,
      nextCursor: hasMore ? (data.at(-1)?.id ?? null) : null,
    };
  }

  private async ensureChannelAccess(
    workspaceId: string,
    channelId: string,
    userId: string,
  ) {
    const workspaceMembership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });

    if (!workspaceMembership) {
      throw new ForbiddenException('You do not have access to this workspace');
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true, isPrivate: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found in this workspace');
    }

    if (channel.isPrivate) {
      const channelMembership = await this.prisma.channelMember.findUnique({
        where: { channelId_userId: { channelId, userId } },
        select: { id: true },
      });

      if (!channelMembership) {
        throw new ForbiddenException('You do not have access to this channel');
      }
    }
  }
}
