'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboardIcon,
  BookOpenIcon,
  UserIcon,
  SettingsIcon,
  ShieldCheckIcon,
  SunIcon,
  MoonIcon,
  BellIcon,
  MenuIcon,
  LogOutIcon,
  DatabaseIcon,
  ChevronRightIcon,
  ZapIcon,
  CpuIcon,
  Avatar,
  Dropdown,
  MoreVerticalIcon,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { useGoToAnalyzer } from '@/hooks/useGoToAnalyzer';

interface NavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

const userNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: <LayoutDashboardIcon size={18} /> },
  { to: '/analyze', label: 'Analyze Job', icon: <ZapIcon size={18} /> },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: <BookOpenIcon size={18} /> },
  { to: '/profile', label: 'Profile', icon: <UserIcon size={18} /> },
];

const adminNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: <LayoutDashboardIcon size={18} /> },
  { to: '/admin/rules', label: 'Rule Manager', icon: <DatabaseIcon size={18} /> },
  { to: '/knowledge-base', label: 'Knowledge Base', icon: <BookOpenIcon size={18} /> },
  { to: '/admin/api-docs', label: 'API Docs', icon: <CpuIcon size={18} /> },
  { to: '/profile', label: 'Account', icon: <UserIcon size={18} /> },
];

// Next.js migration: was mounted as a pathless React Router layout route
// rendering <Outlet/> for its children; now a plain layout component that
// takes `children` directly (app/(dashboard)/layout.tsx passes them in).
// NavLink's isActive render-prop has no Next.js equivalent — usePathname()
// + a manual equality check replaces it, same visual result.
export function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const goToAnalyzer = useGoToAnalyzer();
  const [dark, toggleDark] = useDarkMode();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdmin = user?.role === 'admin';
  const navItems = isAdmin ? adminNavItems : userNavItems;
  const currentLabel = navItems.find((item) => item.to === pathname)?.label ?? 'JobCheck';

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  // Pre-existing pattern, unchanged by the migration: a local component
  // closing over this render's `user`/`pathname`/etc. so the same JSX can be
  // reused for the persistent desktop sidebar and the mobile slide-over
  // without duplicating it or threading every value through as props.
  const SidebarContent = () => (
    <>
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-[var(--border)] flex-shrink-0">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span
            className="font-bold text-[var(--foreground)] text-lg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            JobCheck
          </span>
        </Link>
        {isAdmin && (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--primary)] text-white">
            Admin
          </span>
        )}
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.map((item) => {
          const isActive = pathname === item.to;
          return (
            <Link
              key={item.to}
              href={item.to}
              onClick={() => setSidebarOpen(false)}
              className={`sidebar-link w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                isActive
                  ? 'bg-[var(--primary)] text-white shadow-sm'
                  : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
              }`}
            >
              <span className={isActive ? 'text-white' : ''}>{item.icon}</span>
              {item.label}
              {isActive && <ChevronRightIcon size={14} className="ml-auto opacity-70" />}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4 border-t border-[var(--border)] flex-shrink-0">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-[var(--muted)] transition-colors cursor-pointer group">
          <Avatar name={user?.name ?? '?'} size="sm" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[var(--foreground)] truncate">{user?.name}</p>
            <p className="text-xs text-[var(--muted-foreground)] truncate">{user?.email}</p>
          </div>
          <Dropdown
            trigger={
              <button className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-[var(--border)] transition-all text-[var(--muted-foreground)]">
                <MoreVerticalIcon size={14} />
              </button>
            }
            items={[
              {
                label: 'Profile',
                icon: <UserIcon size={14} />,
                onClick: () => router.push('/profile'),
              },
              {
                label: 'Settings',
                icon: <SettingsIcon size={14} />,
                onClick: () => router.push('/profile'),
              },
              {
                label: 'Sign out',
                icon: <LogOutIcon size={14} />,
                onClick: () => void handleLogout(),
                danger: true,
              },
            ]}
          />
        </div>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-[var(--background)] overflow-hidden">
      <aside className="hidden md:flex flex-col w-60 bg-[var(--card)] border-r border-[var(--border)] flex-shrink-0">
        {/* eslint-disable-next-line react-hooks/static-components */}
        <SidebarContent />
      </aside>

      {sidebarOpen && (
        <div className="md:hidden fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--card)] flex flex-col border-r border-[var(--border)] animate-slide-right">
            {/* eslint-disable-next-line react-hooks/static-components */}
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="flex items-center justify-between h-16 px-6 bg-[var(--card)] border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            >
              <MenuIcon size={18} />
            </button>
            <div className="hidden md:block">
              <h1 className="text-base font-semibold text-[var(--foreground)]">{currentLabel}</h1>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => goToAnalyzer()}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition-all"
            >
              <ZapIcon size={13} />
              Analyze
            </button>

            <button className="relative p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
              <BellIcon size={18} />
            </button>

            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              {dark ? <SunIcon size={18} /> : <MoonIcon size={18} />}
            </button>

            <button
              onClick={() => void handleLogout()}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
            >
              <LogOutIcon size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
