import { registerAs } from '@nestjs/config';

export default registerAs('auth', () => ({
  accessToken: {
    secret: process.env.JWT_ACCESS_SECRET,
    expiresIn: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  },

  refreshToken: {
    secret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },

  cookie: {
    secure: process.env.COOKIE_SECURE === 'true',

    sameSite:
      process.env.COOKIE_SAME_SITE === 'none'
        ? 'none'
        : process.env.COOKIE_SAME_SITE === 'strict'
          ? 'strict'
          : 'lax',
  },
}));