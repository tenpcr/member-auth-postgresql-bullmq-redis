import {
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
  PassportStrategy,
} from '@nestjs/passport';

import {
  Strategy,
} from 'passport-jwt';

import type { Request } from 'express';

import { PrismaService } from '@/prisma/prisma.service.js';

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    super({
      // Read JWT from HttpOnly cookie
      jwtFromRequest: (req: Request) => {
        return req.cookies?.access_token ?? null;
      },

      // Reject expired JWT automatically
      ignoreExpiration: false,

      // Verify JWT using access-token secret
      secretOrKey: config.getOrThrow<string>(
        'JWT_ACCESS_SECRET',
      ),

      // Only allow the expected signing algorithm
      algorithms: ['HS256'],
    });
  }

  async validate(payload: AccessTokenPayload) {
    // Find the session associated with the access token
    const session = await this.prisma.session.findUnique({
      where: {
        id: payload.sid,
      },
      select: {
        userId: true,
        revokedAt: true,
        expiresAt: true,
      },
    });

    // Reject the request when the session does not exist
    if (!session) {
      throw new UnauthorizedException(
        'Session not found',
      );
    }

    // Make sure the session belongs to the JWT user
    if (session.userId !== payload.sub) {
      throw new UnauthorizedException(
        'Invalid session',
      );
    }

    // Reject revoked sessions
    if (session.revokedAt) {
      throw new UnauthorizedException(
        'Session has been revoked',
      );
    }

    // Reject sessions that have expired
    if (session.expiresAt <= new Date()) {
      throw new UnauthorizedException(
        'Session has expired',
      );
    }

    // This object becomes req.user
    return {
      userId: payload.sub,
      sessionId: payload.sid,
    };
  }
}