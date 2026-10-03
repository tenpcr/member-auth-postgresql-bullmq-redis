import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '@/prisma/prisma.service.js';

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Find a user by ID.
   */
  async findById(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  /**
   * Find a user by email.
   */
  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: {
        email: email.trim().toLowerCase(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Update the user's display name.
   */
  async updateName(
    userId: string,
    name: string,
  ) {
    await this.findById(userId);

    return this.prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        name: name.trim(),
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  /**
   * Delete a user account.
   */
  async delete(userId: string) {
    await this.findById(userId);

    await this.prisma.user.delete({
      where: {
        id: userId,
      },
    });

    return {
      message: 'User deleted successfully',
    };
  }
}