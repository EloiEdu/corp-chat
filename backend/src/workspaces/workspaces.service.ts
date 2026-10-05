import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AddWorkspaceMemberDto } from './dto/add-workspace-member.dto.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto, creatorId: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name: dto.name.trim(),
            slug: dto.slug,
          },
        });

        await tx.workspaceMember.create({
          data: {
            workspaceId: workspace.id,
            userId: creatorId,
            role: 'ADMIN',
          },
        });

        return workspace;
      });
    } catch (error) {
      if (this.isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('A workspace with this slug already exists');
      }
      throw error;
    }
  }

  findAll(userId: string) {
    return this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const workspace = await this.prisma.workspace.findFirst({
      where: { id, members: { some: { userId } } },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }

  async addMember(
    workspaceId: string,
    requesterId: string,
    dto: AddWorkspaceMemberDto,
  ) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.findUnique({
          where: { id: workspaceId },
          select: { id: true },
        });
        if (!workspace) throw new NotFoundException('Workspace not found');

        const requesterMembership = await tx.workspaceMember.findUnique({
          where: {
            userId_workspaceId: { userId: requesterId, workspaceId },
          },
          select: { role: true },
        });
        if (!requesterMembership || requesterMembership.role !== 'ADMIN') {
          throw new ForbiddenException(
            'Only workspace administrators can add members',
          );
        }

        const user = await tx.user.findUnique({
          where: { id: dto.userId },
          select: { id: true },
        });
        if (!user) throw new NotFoundException('User not found');

        return tx.workspaceMember.create({
          data: {
            workspaceId,
            userId: dto.userId,
            role: 'MEMBER',
          },
        });
      });
    } catch (error) {
      if (this.isPrismaErrorCode(error, 'P2002')) {
        throw new ConflictException('User is already a workspace member');
      }
      throw error;
    }
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
