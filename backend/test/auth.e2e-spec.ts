import { UnauthorizedException, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import request from 'supertest';
import { App } from 'supertest/types';
import { AuthController } from '../src/auth/auth.controller.js';
import { AuthService } from '../src/auth/auth.service.js';
import { UsersService } from '../src/users/users.service.js';

describe('AuthController (e2e)', () => {
  let app: INestApplication<App>;
  const user = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    email: 'user@example.com',
    fullName: 'Test User',
    avatarUrl: null,
    status: 'OFFLINE',
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };
  const usersService = { validateCredentials: vi.fn() };
  const jwtService = { signAsync: vi.fn() };

  beforeEach(async () => {
    vi.resetAllMocks();
    usersService.validateCredentials.mockResolvedValue(user);
    jwtService.signAsync.mockResolvedValue('test.jwt.token');

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
  });

  it('validates credentials and returns a bearer token', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'correct-password' })
      .expect(201)
      .expect({ access_token: 'test.jwt.token', token_type: 'Bearer' });

    expect(usersService.validateCredentials).toHaveBeenCalledWith(
      'user@example.com',
      'correct-password',
    );
    expect(jwtService.signAsync).toHaveBeenCalledWith({
      sub: user.id,
      email: user.email,
    });
  });

  it('rejects invalid login data', async () => {
    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'not-an-email', password: '' })
      .expect(400);

    expect(usersService.validateCredentials).not.toHaveBeenCalled();
  });

  it('returns unauthorized when credentials are invalid', async () => {
    usersService.validateCredentials.mockRejectedValue(
      new UnauthorizedException('Invalid email or password'),
    );

    await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'user@example.com', password: 'wrong-password' })
      .expect(401);

    expect(jwtService.signAsync).not.toHaveBeenCalled();
  });
});
