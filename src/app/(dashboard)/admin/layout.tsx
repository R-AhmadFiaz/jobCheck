'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';

// Next.js migration equivalent of routes/AdminRoute.tsx. Nested under
// app/(dashboard)/layout.tsx, which already handles the logged-out case —
// this only adds the role check on top.
export default function AdminLayout({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin') {
      router.replace('/dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading || !user || user.role !== 'admin') return null;

  return <>{children}</>;
}
