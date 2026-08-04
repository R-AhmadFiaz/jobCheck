import { apiRequest, setAccessToken } from '@/lib/apiClient';
import type { AuthUser } from '@/features/auth/types';

interface AuthResponse {
  user: AuthUser;
  accessToken: string;
}

export async function register(input: {
  name: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const data = await apiRequest<AuthResponse>('/auth/register', { method: 'POST', body: input });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function login(input: { email: string; password: string }): Promise<AuthUser> {
  const data = await apiRequest<AuthResponse>('/auth/login', { method: 'POST', body: input });
  setAccessToken(data.accessToken);
  return data.user;
}

export async function logout(): Promise<void> {
  try {
    await apiRequest('/auth/logout', { method: 'POST' });
  } finally {
    setAccessToken(null);
  }
}

export async function fetchMe(): Promise<AuthUser> {
  const data = await apiRequest<{ user: AuthUser }>('/auth/me');
  return data.user;
}

// Called once on app boot to restore a session from the httpOnly refresh
// cookie, since the access token itself is memory-only and lost on reload.
export async function silentRefresh(): Promise<boolean> {
  try {
    const data = await apiRequest<{ accessToken: string }>('/auth/refresh', { method: 'POST' });
    setAccessToken(data.accessToken);
    return true;
  } catch {
    return false;
  }
}
