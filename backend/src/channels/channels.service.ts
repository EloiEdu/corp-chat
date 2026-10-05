import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateChannelDto } from './dto/create-channel.dto.js';

@Injectable()
export class ChannelsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(workspaceId: string, dto: CreateChannelDto) {
    await this.ensureWorkspaceExists(workspaceId);

    try {
      return await this.prisma.channel.create({
        data: {
          name: dto.name.trim(),
          description: dto.description?.trim(),
          isPrivate: dto.isPrivate,
          workspaceId,
        },
      });
    } catch (error) {
      if (this.isPrismaErrorCode(error, 'P2003')) {
        throw new NotFoundException('Workspace not found');
      }
      throw error;
    }
  }

  async findAll(workspaceId: string) {
    await this.ensureWorkspaceExists(workspaceId);

    return this.prisma.channel.findMany({
      where: { workspaceId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(workspaceId: string, channelId: string) {
    await this.ensureWorkspaceExists(workspaceId);

    const channel = await this.prisma.channel.findFirst({
      where: { id: channelId, workspaceId },
    });

    if (!channel) throw new NotFoundException('Channel not found');
    return channel;
  }

  private async ensureWorkspaceExists(workspaceId: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id: workspaceId },
      select: { id: true },
    });

    if (!workspace) throw new NotFoundException('Workspace not found');
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
