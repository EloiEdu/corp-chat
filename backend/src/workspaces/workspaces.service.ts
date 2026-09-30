import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateWorkspaceDto } from './dto/create-workspace.dto.js';

@Injectable()
export class WorkspacesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateWorkspaceDto) {
    try {
      return await this.prisma.workspace.create({
        data: {
          name: dto.name.trim(),
          slug: dto.slug,
        },
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A workspace with this slug already exists');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.workspace.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const workspace = await this.prisma.workspace.findUnique({
      where: { id },
    });
    if (!workspace) throw new NotFoundException('Workspace not found');
    return workspace;
  }
}
