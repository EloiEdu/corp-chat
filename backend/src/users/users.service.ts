import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { promisify } from 'node:util';
import { randomBytes, scrypt as scryptCallback } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service.js';
import { CreateUserDto } from './dto/create-user.dto.js';

const scrypt = promisify(scryptCallback);

const publicUserSelect = {
  id: true,
  email: true,
  fullName: true,
  avatarUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const email = dto.email.trim().toLowerCase();
    const salt = randomBytes(16).toString('hex');
    const derivedKey = (await scrypt(dto.password, salt, 64)) as Buffer;
    const passwordHash = `scrypt:${salt}:${derivedKey.toString('hex')}`;

    try {
      return await this.prisma.user.create({
        data: { email, fullName: dto.fullName.trim(), passwordHash },
        select: publicUserSelect,
      });
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('A user with this email already exists');
      }
      throw error;
    }
  }

  findAll() {
    return this.prisma.user.findMany({
      select: publicUserSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: publicUserSelect,
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
