// Production-hardening / Next.js migration: switched from `bcrypt` (native
// C++ binding — a documented source of Vercel build-time failures) to
// `bcryptjs` (pure JS, same algorithm/output format). Verified
// bidirectionally compatible with existing bcrypt-generated hashes before
// this swap — see the migration report. Behavior (cost factor, hash format)
// is unchanged; only the implementation library differs.
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

export function hashPassword(plainPassword: string): Promise<string> {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
}

export function verifyPassword(plainPassword: string, passwordHash: string): Promise<boolean> {
  return bcrypt.compare(plainPassword, passwordHash);
}
