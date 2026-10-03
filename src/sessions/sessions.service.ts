import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service.js';

@Injectable()
export class SessionsService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Get all active sessions for a user.
   */
  async findAllByUserId(userId: string) {
    return this.prisma.session.findMany({
      where: {
        userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },

      select: {
        id: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        createdAt: true,
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  /**
   * Get a single session by ID.
   */
  async findById(
    userId: string,
    sessionId: string,
  ) {
    const session = await this.prisma.session.findFirst({
      where: {
        id: sessionId,
        userId,
      },

      select: {
        id: true,
        userId: true,
        userAgent: true,
        ipAddress: true,
        expiresAt: true,
        revokedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    return session;
  }

  /**
   * Revoke a specific session.
   */
  async revoke(
    userId: string,
    sessionId: string,
  ) {
    const result = await this.prisma.session.updateMany({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'Session not found or already revoked',
      );
    }

    return {
      message: 'Session revoked successfully',
    };
  }

  /**
   * Revoke all active sessions except the current session.
   */
  async revokeOtherSessions(
    userId: string,
    currentSessionId: string,
  ) {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        id: {
          not: currentSessionId,
        },
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'Other sessions revoked successfully',
      revokedCount: result.count,
    };
  }

  /**
   * Revoke all active sessions for a user.
   */
  async revokeAll(userId: string) {
    const result = await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },

      data: {
        revokedAt: new Date(),
      },
    });

    return {
      message: 'All sessions revoked successfully',
      revokedCount: result.count,
    };
  }

  /**
   * Remove expired and revoked sessions.
   *
   * This method can later be called by a scheduled job.
   */
  async cleanup() {
    const result = await this.prisma.session.deleteMany({
      where: {
        OR: [
          {
            expiresAt: {
              lt: new Date(),
            },
          },
          {
            revokedAt: {
              not: null,
            },
          },
        ],
      },
    });

    return {
      deletedCount: result.count,
    };
  }
}