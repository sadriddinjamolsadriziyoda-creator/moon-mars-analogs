import { timingSafeEqual, randomBytes, createHash } from 'node:crypto';
import type { RequestHandler } from 'express';

/**
 * Constant-time comparison on equal-length buffers. timingSafeEqual throws on a length
 * mismatch, which would itself leak the token length through an exception path — so both
 * sides are hashed to a fixed length first and the digests are compared.
 */
export function tokenMatches(provided: string | undefined, expected: string | undefined): boolean {
  if (!provided || !expected) return false;
  const a = Buffer.from(hash(provided), 'hex');
  const b = Buffer.from(hash(expected), 'hex');
  return timingSafeEqual(a, b);
}

function hash(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

export function requireAdmin(expectedToken: string | undefined): RequestHandler {
  return (req, res, next) => {
    if (!expectedToken) {
      res.status(503).json({ error: 'ADMIN_TOKEN is not set on the server' });
      return;
    }
    const header = req.header('authorization') ?? '';
    const bearer = header.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!tokenMatches(bearer, expectedToken)) {
      res.status(401).json({ error: 'unauthorized' });
      return;
    }
    next();
  };
}

export function generateToken(): string {
  return randomBytes(32).toString('hex');
}