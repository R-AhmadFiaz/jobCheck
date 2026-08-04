export type UserRole = 'user' | 'admin';
export type UserPlan = 'free' | 'premium';

export interface AuthUser {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  plan: UserPlan;
  isVerified: boolean;
  isBanned: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}
