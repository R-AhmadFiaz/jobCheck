import crypto from 'node:crypto';
import type { Types } from 'mongoose';
import { User, type IUser, type UserRole } from '@/modules/users/user.model';
import { RefreshToken } from '@/modules/auth/refreshToken.model';
import type { RequestMeta } from '@/modules/auth/auth.types';
import type { RegisterInput, LoginInput } from '@/modules/auth/auth.validation';
import { hashPassword, verifyPassword } from '@/shared/utils/password';
import { signAccessToken } from '@/shared/utils/jwt';
import { ApiError } from '@/shared/utils/ApiError';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function generateOpaqueToken(): string {
  return crypto.randomBytes(48).toString('hex');
}

async function issueSession(
  userId: Types.ObjectId,
  role: UserRole,
  meta: RequestMeta,
): Promise<AuthSession> {
  const accessToken = signAccessToken({ userId: userId.toString(), role });
  const refreshToken = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + env.REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000);

  await RefreshToken.create({
    userId,
    tokenHash: hashToken(refreshToken),
    userAgent: meta.userAgent,
    ipAddress: meta.ipAddress,
    expiresAt,
  });

  return { accessToken, refreshToken };
}

export async function registerUser(
  input: RegisterInput,
  meta: RequestMeta,
): Promise<{ user: IUser } & AuthSession> {
  const existing = await User.findOne({ email: input.email });
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name,
    email: input.email,
    passwordHash,
  });

  const session = await issueSession(user._id, user.role, meta);
  return { user, ...session };
}

export async function loginUser(
  input: LoginInput,
  meta: RequestMeta,
): Promise<{ user: IUser } & AuthSession> {
  const user = await User.findOne({ email: input.email }).select('+passwordHash');
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const passwordMatches = await verifyPassword(input.password, user.passwordHash);
  if (!passwordMatches) {
    throw new ApiError(401, 'Invalid email or password');
  }

  if (user.isBanned) {
    throw new ApiError(403, 'This account has been suspended');
  }

  user.lastLoginAt = new Date();
  await user.save();

  const session = await issueSession(user._id, user.role, meta);
  return { user, ...session };
}

export async function refreshSession(
  rawRefreshToken: string,
  meta: RequestMeta,
): Promise<AuthSession> {
  const tokenHash = hashToken(rawRefreshToken);
  const existingToken = await RefreshToken.findOne({ tokenHash });

  if (!existingToken) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (existingToken.revokedAt) {
    logger.warn(
      { userId: existingToken.userId.toString() },
      'Refresh token reuse detected — revoking all active sessions for this user',
    );
    await RefreshToken.updateMany(
      { userId: existingToken.userId, revokedAt: null },
      { revokedAt: new Date() },
    );
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  if (existingToken.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  const user = await User.findById(existingToken.userId);
  if (!user || user.isBanned) {
    throw new ApiError(401, 'Invalid or expired refresh token');
  }

  existingToken.revokedAt = new Date();
  await existingToken.save();

  return issueSession(user._id, user.role, meta);
}

export async function logoutUser(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const tokenHash = hashToken(rawRefreshToken);
  await RefreshToken.updateOne({ tokenHash, revokedAt: null }, { revokedAt: new Date() });
}

export async function getUserById(userId: string): Promise<IUser> {
  const user = await User.findById(userId);
  if (!user) {
    throw new ApiError(404, 'User not found');
  }
  return user;
}
