import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import type { AuthenticatedRequest } from '@/auth/types/auth.types.js';

import { AuthService } from '@/auth/auth.service.js';
import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard.js';

import { RegisterDto } from '@/auth/dto/register.dto.js';
import { LoginDto } from '@/auth/dto/login.dto.js';
import { ChangePasswordDto } from '@/auth/dto/change-password.dto.js';
import { ForgotPasswordDto } from '@/auth/dto/forgot-password.dto.js';
import { ResetPasswordDto } from '@/auth/dto/reset-password.dto.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * Register
   * POST /auth/register
   */
  @Post('register')
  async register(
    @Body() body: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.register(body, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    this.setAccessTokenCookie(res, result.accessToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Login
   * POST /auth/login
   */
  @Post('login')
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    this.setAccessTokenCookie(res, result.accessToken);
    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      user: result.user,
      accessToken: result.accessToken,
    };
  }

  /**
   * Refresh Access Token
   * POST /auth/refresh
   */
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;

    const result = await this.authService.refresh(refreshToken);

    this.setRefreshTokenCookie(res, result.refreshToken);

    return {
      accessToken: result.accessToken,
    };
  }

  /**
   * Logout current session
   * POST /auth/logout
   */
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refresh_token;

    await this.authService.logout(refreshToken);

    this.clearAccessTokenCookie(res);
    this.clearRefreshTokenCookie(res);

    return {
      message: 'Logged out successfully',
    };
  }

  /**
   * Logout all sessions
   * POST /auth/logout-all
   */
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  async logoutAll(
    @Req() req: AuthenticatedRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.logoutAll(req.user.userId);

    this.clearAccessTokenCookie(res);
    this.clearRefreshTokenCookie(res);

    return {
      message: 'Logged out from all devices',
    };
  }

  /**
   * Current user
   * GET /auth/me
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: AuthenticatedRequest) {
    return this.authService.me(req.user.userId);
  }

  /**
   * Change password
   * POST /auth/change-password
   */
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req: AuthenticatedRequest,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    await this.authService.changePassword(
      req.user.userId,
      req.user.sessionId,
      dto,
    );

    this.clearAccessTokenCookie(res);
    this.clearRefreshTokenCookie(res);

    return {
      message: 'Password changed successfully',
    };
  }

  /**
   * Forgot password
   * POST /auth/forgot-password
   */
  @Post('forgot-password')
  async forgotPassword(@Body() dto: ForgotPasswordDto, @Req() req: Request) {
    await this.authService.forgotPassword(dto, {
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
    });

    return {
      message: 'If the email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password
   * POST /auth/reset-password
   */
  @Post('reset-password')
  async resetPassword(@Body() dto: ResetPasswordDto) {
    await this.authService.resetPassword(dto);

    return {
      message: 'Password reset successfully',
    };
  }

  /**
   * Set acess token cookie
   */

  private setAccessTokenCookie(res: Response, accessToken: string) {
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });
  }

  /**
   * Set refresh token cookie
   */
  private setRefreshTokenCookie(res: Response, refreshToken: string) {
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax',
      path: '/auth',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }

  /**
   * Clear access token cookie
   */
  private clearAccessTokenCookie(res: Response) {
    res.clearCookie('access_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax',
      path: '/',
    });
  }

  /**
   * Clear refresh token cookie
   */
  private clearRefreshTokenCookie(res: Response) {
    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax',
      path: '/auth',
    });
  }
}
