import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import Joi from 'joi';

import { AppController } from '@/app.controller.js';
import { AppService } from '@/app.service.js';

import { PrismaModule } from '@/prisma/prisma.module.js';
import { AuthModule } from '@/auth/auth.module.js';
import { UsersModule } from '@/users/users.module.js';
import { SessionsModule } from '@/sessions/sessions.module.js';
import { QueueModule } from '@/queue/queue.module.js';

@Module({
  imports: [
    // ============================================================
    // Environment Configuration
    // ============================================================

    ConfigModule.forRoot({
      isGlobal: true,

      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'test', 'production')
          .default('development'),

        PORT: Joi.number().default(3000),

        DATABASE_URL: Joi.string().required(),

        // ========================================================
        // JWT
        // ========================================================

        JWT_ACCESS_SECRET: Joi.string().min(32).required(),

        JWT_ACCESS_EXPIRES_IN: Joi.string().default('15m'),

        JWT_REFRESH_SECRET: Joi.string().min(32).required(),

        JWT_REFRESH_EXPIRES_IN: Joi.string().default('7d'),

        // ========================================================
        // Frontend
        // ========================================================

        FRONTEND_URL: Joi.string().uri().required(),

        // ========================================================
        // Cookie
        // ========================================================

        COOKIE_SECURE: Joi.boolean().default(false),

        COOKIE_SAME_SITE: Joi.string()
          .valid('lax', 'strict', 'none')
          .default('lax'),

        // ========================================================
        // NodeMailer
        // ========================================================

        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.string().required(),
        MAIL_SECURE: Joi.string().required(),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        EMAIL_FROM: Joi.string().required(),
      }),
    }),

    // ============================================================
    // BullMQ
    // ============================================================

    BullModule.forRoot({
      connection: {
        url: process.env.REDIS_URL ?? 'redis://localhost:6379',
      },
    }),

    // ============================================================
    // Application Modules
    // ============================================================

    PrismaModule,

    AuthModule,

    UsersModule,

    SessionsModule,

    QueueModule,
  ],

  controllers: [AppController],

  providers: [AppService],
})
export class AppModule {}
