import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { createHash, randomUUID } from 'crypto';

import { PrismaService } from '@/prisma/prisma.service.js';

import { RegisterDto } from '@/auth/dto/register.dto.js';
import { LoginDto } from '@/auth/dto/login.dto.js';
import { ChangePasswordDto } from '@/auth/dto/change-password.dto.js';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto.js';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto.js';

import { EmailProducer } from '@/queue/email.producer.js';

import type { StringValue } from 'ms';

interface RequestMeta {
  ipAddress?: string;
  userAgent?: string;
}

interface AccessTokenPayload {
  sub: string;
  sid: string;
}

interface RefreshTokenPayload {
  sub: string;
  sid: string;
  type: 'refresh';
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly emailProducer: EmailProducer,
  ) {}

  // ============================================================
  // REGISTER
  // ============================================================

async register(dto: RegisterDto, meta: RequestMeta) {
  const email = this.normalizeEmail(dto.email);

  const existingUser = await this.prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (existingUser) {
    throw new ConflictException('Email is already registered');
  }

  const passwordHash = await argon2.hash(dto.password, {
    type: argon2.argon2id,
  });

  let user;

  try {
    user = await this.prisma.user.create({
      data: {
        email,
        passwordHash,
        firstname: dto.firstname?.trim() || null,
        lastname: dto.lastname?.trim() || null,
      },
    });
  } catch (error: any) {
    if (error?.code === 'P2002') {
      throw new ConflictException('Email is already registered');
    }

    throw error;
  }

  const sessionId = randomUUID();

  const tokens = await this.createTokens(
    user.id,
    sessionId,
  );

  await this.createSession(
    user.id,
    sessionId,
    tokens.refreshToken,
    meta,
  );

  // Queue welcome email
  await this.emailProducer.sendWelcomeEmail({
    to: email,
    name:
      [dto.firstname, dto.lastname]
        .filter(Boolean)
        .join(' ') || undefined,
  });

  return {
    user: this.sanitizeUser(user),
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

  // ============================================================
  // LOGIN
  // ============================================================

  async login(dto: LoginDto, meta: RequestMeta) {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.passwordHash) {
      throw new UnauthorizedException('This account does not have a password');
    }

    const passwordValid = await argon2.verify(user.passwordHash, dto.password);

    if (!passwordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const sessionId = randomUUID();

    const tokens = await this.createTokens(user.id, sessionId);

    await this.createSession(user.id, sessionId, tokens.refreshToken, meta);

    return {
      user: this.sanitizeUser(user),
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ============================================================
  // REFRESH TOKEN
  // ============================================================

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          algorithms: ['HS256'],
        },
      );
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const session = await this.prisma.session.findUnique({
      where: {
        id: payload.sid,
      },
    });

    if (
      !session ||
      session.userId !== payload.sub ||
      session.revokedAt ||
      session.expiresAt <= new Date()
    ) {
      throw new UnauthorizedException('Session expired or revoked');
    }

    const incomingHash = this.hashToken(refreshToken);

    // ========================================================
    // Refresh Token Rotation / Reuse Detection
    // ========================================================

    if (session.refreshTokenHash !== incomingHash) {
      await this.prisma.session.update({
        where: {
          id: session.id,
        },
        data: {
          revokedAt: new Date(),
        },
      });

      throw new UnauthorizedException('Refresh token reuse detected');
    }

    const tokens = await this.createTokens(session.userId, session.id);

    const newRefreshTokenHash = this.hashToken(tokens.refreshToken);

    const updated = await this.prisma.session.updateMany({
      where: {
        id: session.id,
        refreshTokenHash: incomingHash,
        revokedAt: null,
      },
      data: {
        refreshTokenHash: newRefreshTokenHash,
        expiresAt: this.getRefreshTokenExpiry(),
      },
    });

    if (updated.count !== 1) {
      throw new UnauthorizedException('Refresh token is no longer valid');
    }

    return {
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
    };
  }

  // ============================================================
  // LOGOUT
  // ============================================================

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return;
    }

    let payload: RefreshTokenPayload;

    try {
      payload = await this.jwtService.verifyAsync<RefreshTokenPayload>(
        refreshToken,
        {
          secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
          algorithms: ['HS256'],
        },
      );
    } catch {
      return;
    }

    await this.prisma.session.updateMany({
      where: {
        id: payload.sid,
        userId: payload.sub,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  // ============================================================
  // LOGOUT ALL
  // ============================================================

  async logoutAll(userId: string) {
    await this.prisma.session.updateMany({
      where: {
        userId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  // ============================================================
  // ME
  // ============================================================

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  // ============================================================
  // CHANGE PASSWORD
  // ============================================================

  async changePassword(
    userId: string,
    currentSessionId: string,
    dto: ChangePasswordDto,
  ) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException('User not found');
    }

    const currentPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.currentPassword,
    );

    if (!currentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (dto.currentPassword === dto.newPassword) {
      throw new ConflictException('New password must be different');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: userId,
        },
        data: {
          passwordHash,
        },
      }),

      // Logout session อื่นทั้งหมด
      this.prisma.session.updateMany({
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
      }),

      // Revoke session ปัจจุบันด้วย
      this.prisma.session.update({
        where: {
          id: currentSessionId,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  // ============================================================
  // FORGOT PASSWORD
  // ============================================================

  async forgotPassword(dto: ForgotPasswordDto, meta: RequestMeta) {
    const email = this.normalizeEmail(dto.email);

    const user = await this.prisma.user.findUnique({
      where: {
        email,
      },
    });

    if (!user) {
      return;
    }

    const rawToken = this.generateSecureToken();

    const tokenHash = this.hashToken(rawToken);

    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });

    void meta;

    console.log('[DEV] Password reset token:', rawToken);
  }

  // ============================================================
  // RESET PASSWORD
  // ============================================================

  async resetPassword(dto: ResetPasswordDto) {
    const tokenHash = this.hashToken(dto.token);

    const resetToken = await this.prisma.passwordResetToken.findFirst({
      where: {
        tokenHash,
        usedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
    });

    if (!resetToken) {
      throw new UnauthorizedException('Invalid or expired reset token');
    }

    const passwordHash = await argon2.hash(dto.newPassword, {
      type: argon2.argon2id,
    });

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: {
          id: resetToken.userId,
        },
        data: {
          passwordHash,
        },
      }),

      this.prisma.passwordResetToken.update({
        where: {
          id: resetToken.id,
        },
        data: {
          usedAt: new Date(),
        },
      }),

      this.prisma.session.updateMany({
        where: {
          userId: resetToken.userId,
          revokedAt: null,
        },
        data: {
          revokedAt: new Date(),
        },
      }),
    ]);
  }

  // ============================================================
  // CREATE SESSION
  // ============================================================

  private async createSession(
    userId: string,
    sessionId: string,
    refreshToken: string,
    meta: RequestMeta,
  ) {
    return this.prisma.session.create({
      data: {
        id: sessionId,
        userId,

        refreshTokenHash: this.hashToken(refreshToken),

        userAgent: meta.userAgent?.substring(0, 500) ?? null,

        ipAddress: meta.ipAddress?.substring(0, 64) ?? null,

        expiresAt: this.getRefreshTokenExpiry(),
      },
    });
  }

  // ============================================================
  // CREATE TOKENS
  // ============================================================

  private async createTokens(userId: string, sessionId: string) {
    const accessToken = await this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
      } satisfies AccessTokenPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),

        expiresIn: this.config.get<StringValue>('JWT_ACCESS_EXPIRES_IN', '15m'),

        algorithm: 'HS256',
      },
    );

    const refreshToken = await this.jwtService.signAsync(
      {
        sub: userId,
        sid: sessionId,
        type: 'refresh',
      } satisfies RefreshTokenPayload,
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),

        expiresIn: this.config.get<StringValue>('JWT_REFRESH_EXPIRES_IN', '7d'),

        algorithm: 'HS256',
      },
    );

    return {
      accessToken,
      refreshToken,
    };
  }

  // ============================================================
  // HASH TOKEN
  // ============================================================

  private hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  // ============================================================
  // GENERATE SECURE TOKEN
  // ============================================================

  private generateSecureToken(): string {
    return randomUUID() + randomUUID();
  }

  // ============================================================
  // REFRESH TOKEN EXPIRY
  // ============================================================

  private getRefreshTokenExpiry(): Date {
    const expiresIn = this.config.get<string>('JWT_REFRESH_EXPIRES_IN', '7d');

    const match = expiresIn.match(/^(\d+)([smhd])$/);

    if (!match) {
      throw new Error('Invalid JWT_REFRESH_EXPIRES_IN format');
    }

    const value = Number(match[1]);

    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return new Date(Date.now() + value * multipliers[unit]);
  }

  // ============================================================
  // NORMALIZE EMAIL
  // ============================================================

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  // ============================================================
  // REMOVE SENSITIVE USER DATA
  // ============================================================

  private sanitizeUser(user: any) {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      emailVerifiedAt: user.emailVerifiedAt,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
