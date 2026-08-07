import type { Request } from 'express';

export interface SessionContext {
  userId: string;
  sessionId: string;
}

export interface SessionRequest extends Request {
  user?: SessionContext;
}
