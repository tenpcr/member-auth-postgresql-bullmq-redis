import {
  Body,
  Controller,
  Delete,
  Get,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';

import type { Request } from 'express';

import { JwtAuthGuard } from '@/auth/guards/jwt-auth.guard.js';
import { UsersService } from '@/users/users.service.js';

interface AuthenticatedRequest extends Request {
  user: {
    userId: string;
    sessionId: string;
  };
}

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
  ) {}

  /**
   * Get the currently authenticated user.
   */
  @Get('me')
  async me(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.findById(
      req.user.userId,
    );
  }

  /**
   * Update the current user's display name.
   */
  @Patch('me/name')
  async updateName(
    @Req() req: AuthenticatedRequest,
    @Body('name') name: string,
  ) {
    return this.usersService.updateName(
      req.user.userId,
      name,
    );
  }

  /**
   * Delete the current user's account.
   */
  @Delete('me')
  async delete(
    @Req() req: AuthenticatedRequest,
  ) {
    return this.usersService.delete(
      req.user.userId,
    );
  }
}