import type { Request } from 'express';

export interface AuthUser {
  userId: string;
  sessionId: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}