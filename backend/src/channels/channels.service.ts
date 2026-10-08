import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateChannelDto } from './dto/create-channel.dto.js';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateChannelDto, userId?: string) {
    await this.ensureWorkspaceMembership(workspaceId, userId);

    try {
      return await this.prisma.channel.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          isPrivate: dto.isPrivate ?? false,
          workspaceId,
          createdById: userId,
          members: userId
            ? {
                create: {
                  userId,
                },
              }
            : undefined,
        },
      });
    } catch (error) {
      if (this.isPrismaErrorCode(error, 'P2003')) {
        throw new NotFoundException('Workspace not found');
      }
      throw error;
    }
  }

  async findAll(workspaceId: string, userId: string) {
    await this.ensureWorkspaceMembership(workspaceId, userId);

    return this.prisma.channel.findMany({
      where: {
        workspaceId,
        OR: [
          { isPrivate: false },
          { isPrivate: true, members: { some: { userId } } },
        ],
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(workspaceId: string, channelId: string, userId: string) {
    await this.ensureWorkspaceMembership(workspaceId, userId);

    const channel = await this.prisma.channel.findFirst({
      where: {
        id: channelId,
        workspaceId,
        OR: [
          { isPrivate: false },
          { isPrivate: true, members: { some: { userId } } },
        ],
      },
    });

    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  async remove(workspaceId: string, channelId: string, userId?: string) {
    if (!userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { role: true },
    });

    if (!membership) {
      throw new NotFoundException('Workspace not found');
    }

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
      select: { id: true, createdById: true },
    });

    if (!channel) {
      throw new NotFoundException('Channel not found in this workspace');
    }

    if (membership.role !== 'ADMIN' && channel.createdById !== userId) {
      throw new ForbiddenException(
        'Only workspace administrators or the channel creator can delete channels',
      );
    }

    return this.prisma.channel.delete({ where: { id: channelId } });
  }

  private async ensureWorkspaceMembership(
    workspaceId: string,
    userId?: string,
  ) {
    if (!userId) {
      throw new ForbiddenException('Authenticated user is required');
    }

    const membership = await this.prisma.workspaceMember.findUnique({
      where: { userId_workspaceId: { userId, workspaceId } },
      select: { id: true },
    });

    if (!membership) throw new NotFoundException('Workspace not found');
  }

  private isPrismaErrorCode(error: unknown, code: string): boolean {
    return (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      error.code === code
    );
  }
}
