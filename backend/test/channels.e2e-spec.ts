import { ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { ChannelsController } from '../src/channels/channels.controller.js';
import { ChannelsService } from '../src/channels/channels.service.js';

describe('ChannelsController (e2e)', () => {
  let app: INestApplication<App>;
  const channelsService = {
    create: vi.fn(),
    findAll: vi.fn(),
    findOne: vi.fn(),
  };

  beforeEach(async () => {
    vi.resetAllMocks();

    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [ChannelsController],
      providers: [{ provide: ChannelsService, useValue: channelsService }],
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

  it('creates a channel in a workspace', async () => {
    const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
    const channel = { id: 'channel-id', name: 'general', workspaceId };
    channelsService.create.mockResolvedValue(channel);

    await request(app.getHttpServer())
      .post(`/workspaces/${workspaceId}/channels`)
      .send({ name: 'general', isPrivate: true })
      .expect(201)
      .expect(channel);

    expect(channelsService.create).toHaveBeenCalledWith(workspaceId, {
      name: 'general',
      isPrivate: true,
    });
  });

  it('lists channels in a workspace', async () => {
    const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
    const channels = [{ id: 'channel-id', name: 'general', workspaceId }];
    channelsService.findAll.mockResolvedValue(channels);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/channels`)
      .expect(200)
      .expect(channels);

    expect(channelsService.findAll).toHaveBeenCalledWith(workspaceId);
  });

  it('finds a channel within a workspace', async () => {
    const workspaceId = '550e8400-e29b-41d4-a716-446655440000';
    const channelId = '550e8400-e29b-41d4-a716-446655440001';
    const channel = { id: channelId, name: 'general', workspaceId };
    channelsService.findOne.mockResolvedValue(channel);

    await request(app.getHttpServer())
      .get(`/workspaces/${workspaceId}/channels/${channelId}`)
      .expect(200)
      .expect(channel);

    expect(channelsService.findOne).toHaveBeenCalledWith(workspaceId, channelId);
  });

  it('rejects invalid workspace or channel UUIDs', async () => {
    await request(app.getHttpServer())
      .get('/workspaces/not-a-uuid/channels')
      .expect(400);

    await request(app.getHttpServer())
      .get('/workspaces/550e8400-e29b-41d4-a716-446655440000/channels/not-a-uuid')
      .expect(400);
  });

  it('rejects invalid channel data', async () => {
    await request(app.getHttpServer())
      .post('/workspaces/550e8400-e29b-41d4-a716-446655440000/channels')
      .send({ name: '' })
      .expect(400);

    expect(channelsService.create).not.toHaveBeenCalled();
  });
});
