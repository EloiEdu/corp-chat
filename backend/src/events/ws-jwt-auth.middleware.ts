import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';

interface JwtPayload {
  sub: string;
  email: string;
}

@Injectable()
export class WsJwtAuthMiddleware {
  constructor(private readonly jwtService: JwtService) {}

  async use(client: Socket, next: (error?: Error) => void): Promise<void> {
    const token = this.getToken(client);
    if (!token) {
      next(new Error('Unauthorized'));
      return;
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
      if (typeof payload.sub !== 'string' || typeof payload.email !== 'string') {
        throw new Error('Invalid token payload');
      }

      client.data.user = { userId: payload.sub, email: payload.email };
      next();
    } catch {
      next(new Error('Unauthorized'));
    }
  }

  private getToken(client: Socket): string | undefined {
    const handshakeToken = client.handshake.auth?.token;
    if (typeof handshakeToken === 'string' && handshakeToken.length > 0) {
      return handshakeToken.replace(/^Bearer\s+/i, '');
    }

    const authorization = client.handshake.headers.authorization;
    if (typeof authorization !== 'string') return undefined;

    const match = authorization.match(/^Bearer\s+(.+)$/i);
    return match?.[1];
  }
}
