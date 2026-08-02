import type { NextFunction, Request, Response } from 'express';
import { verifyAccessToken } from '@/shared/utils/jwt';

// Unlike `authenticate`, a missing/invalid token is not an error here — it just
// means the requester stays anonymous. Used on routes that serve both owned
// and public (guest-run, userId: null) resources, e.g. GET /analyses/:id.
export function optionalAuthenticate(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (header?.startsWith('Bearer ')) {
    try {
      req.user = verifyAccessToken(header.slice('Bearer '.length));
    } catch {
      // Invalid/expired token on an optional-auth route: proceed as anonymous
      // rather than blocking the request.
    }
  }

  next();
}
