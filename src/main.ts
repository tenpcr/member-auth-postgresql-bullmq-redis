import { NestFactory } from '@nestjs/core';
import {
  ValidationPipe,
} from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface.js';
import cookieParser from 'cookie-parser';

import { AppModule } from './app.module.js';

async function bootstrap() {
  const app =
    await NestFactory.create(AppModule);

  app.use(cookieParser());

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const allowedOrigins = [
    'http://localhost:3001',
    'http://localhost:3002',

    'https://www.example.com',
    'https://admin.example.com',
    'https://app.example.com',
  ];

  const corsOptions: CorsOptions = {
    origin: (
      origin: string | undefined,
      callback,
    ) => {
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error('Not allowed by CORS'),
      );
    },

    credentials: true,
  };

  app.enableCors(corsOptions);

  await app.listen(
    process.env.PORT ?? 8080,
  );
}

await bootstrap();