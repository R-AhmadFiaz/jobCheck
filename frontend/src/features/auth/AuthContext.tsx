import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import * as authApi from '@/features/auth/api/auth.api';
import type { AuthUser } from '@/features/auth/types';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const refreshed = await authApi.silentRefresh();
      if (!cancelled && refreshed) {
        try {
          setUser(await authApi.fetchMe());
        } catch {
          setUser(null);
        }
      }
      if (!cancelled) setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const value: AuthContextValue = {
    user,
    isLoading,
    login: async (email, password) => {
      setUser(await authApi.login({ email, password }));
    },
    register: async (name, email, password) => {
      setUser(await authApi.register({ name, email, password }));
    },
    logout: async () => {
      await authApi.logout();
      setUser(null);
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
