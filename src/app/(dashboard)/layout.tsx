'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';

// Next.js migration equivalent of routes/ProtectedRoute.tsx: that component
// rendered <Navigate to="/login" .../> when unauthenticated; a layout can't
// return a redirect element mid-render like a route element could, so the
// redirect is issued imperatively in an effect instead. Same net behavior:
// nothing protected ever renders for a logged-out user.
export default function AuthenticatedLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace('/login');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user) return null;

  return <DashboardLayout>{children}</DashboardLayout>;
}
