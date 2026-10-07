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

  async findAll(userId: string) {
    const workspaces = await this.prisma.workspace.findMany({
      where: { members: { some: { userId } } },
      include: {
        members: {
          where: { userId },
          select: { role: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Retorna somente o papel do usuário atual, sem expor os demais membros.
    return workspaces.map(({ members, ...workspace }) => ({
      ...workspace,
      role: members[0]?.role ?? null,
    }));
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
            role: dto.role ?? 'MEMBER',
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

  async remove(workspaceId: string, userId?: string) {
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

    if (membership.role !== 'ADMIN') {
      throw new ForbiddenException(
        'Only workspace administrators can delete the workspace',
      );
    }

    return this.prisma.workspace.delete({
      where: { id: workspaceId },
    });
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
