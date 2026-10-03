import { registerAs } from '@nestjs/config';

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',

  port: Number(process.env.PORT ?? 3000),

  frontendUrls: (process.env.FRONTEND_URLS ?? '')
    .split(',')
    .map((url) => url.trim())
    .filter(Boolean),
}));