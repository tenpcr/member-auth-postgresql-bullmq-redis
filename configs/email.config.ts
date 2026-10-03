import { registerAs } from '@nestjs/config';

export default registerAs('email', () => ({
  sendGridApiKey: process.env.SENDGRID_API_KEY,

  from: process.env.EMAIL_FROM,

  frontendUrl: process.env.FRONTEND_URLS
    ?.split(',')
    .map((url) => url.trim())
    .filter(Boolean)[0],
}));