import { randomUUID } from 'crypto';
import type { NextFunction, Request, Response } from 'express';

export type RequestWithId = Request & { requestId: string };

export function requestIdMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const incoming = req.header('x-request-id');
  const id =
    incoming && incoming.trim()
      ? incoming.trim().slice(0, 80)
      : randomUUID();
  (req as RequestWithId).requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
}
