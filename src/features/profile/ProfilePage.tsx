'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Button,
  Input,
  Alert,
  Badge,
  Tabs,
  Avatar,
  UserIcon,
  MailIcon,
  LockIcon,
  ShieldCheckIcon,
  BellIcon,
  CreditCardIcon,
  CheckCircleIcon,
  LogOutIcon,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { MAX_HISTORY_PAGE_SIZE, getAnalysisHistory } from '@/features/analysis/api/analysis.api';

export function ProfilePage() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState('account');

  const { data, isError } = useQuery({
    queryKey: ['analyses', 'profile-stats'],
    queryFn: () => getAnalysisHistory(1, MAX_HISTORY_PAGE_SIZE),
  });

  const items = data?.items ?? [];
  const scamsCaught = items.filter(
    ({ analysis }) => analysis.riskLevel === 'high' || analysis.riskLevel === 'critical',
  ).length;

  const handleLogout = async () => {
    await logout();
    router.replace('/');
  };

  if (!user) return null;

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-5 animate-fade-up">
        <Avatar name={user.name} size="xl" />
        <div>
          <h1
            className="text-2xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {user.name}
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">{user.email}</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant={user.plan === 'premium' ? 'purple' : 'default'}>
              {user.plan === 'premium' ? 'Premium plan' : 'Free plan'}
            </Badge>
            {user.isVerified && (
              <Badge variant="safe">
                <CheckCircleIcon size={10} /> Verified
              </Badge>
            )}
            <span className="text-xs text-[var(--muted-foreground)]">
              Member since{' '}
              {new Date(user.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </div>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'account', label: 'Account', icon: <UserIcon size={14} /> },
          { id: 'security', label: 'Security', icon: <ShieldCheckIcon size={14} /> },
          { id: 'notifications', label: 'Notifications', icon: <BellIcon size={14} /> },
          { id: 'billing', label: 'Billing', icon: <CreditCardIcon size={14} /> },
        ]}
        className="animate-fade-up stagger-1"
      />

      {tab === 'account' && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-5">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input label="Full name" value={user.name} icon={<UserIcon size={15} />} disabled />
                <Input
                  label="Email address"
                  value={user.email}
                  icon={<MailIcon size={15} />}
                  disabled
                />
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Editing your profile isn&apos;t available yet — this is planned for a future release.
              </p>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">Usage Statistics</h3>
            {isError && (
              <div className="mb-4">
                <Alert variant="error" title="Couldn't load your statistics">
                  Analyses run and risk counts below may be incomplete.
                </Alert>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Analyses run', val: data?.total ?? 0 },
                { label: 'High/critical risk found', val: scamsCaught },
              ].map((s) => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-[var(--muted)]">
                  <p
                    className="text-2xl font-extrabold text-[var(--foreground)]"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {s.val}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Account deletion isn&apos;t available yet — this is planned for a future release.
            </p>
            <Button variant="danger" size="sm" disabled>
              Delete account
            </Button>
          </Card>
        </div>
      )}

      {tab === 'security' && (
        <div className="space-y-4 animate-fade-in">
          <Alert variant="info">
            Password changes, two-factor authentication, and session management aren&apos;t available yet
            — they&apos;re planned for a future release.
          </Alert>
          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-5">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <Input
                label="Current password"
                type="password"
                placeholder="••••••••"
                icon={<LockIcon size={15} />}
                disabled
              />
              <Input
                label="New password"
                type="password"
                placeholder="••••••••"
                icon={<LockIcon size={15} />}
                disabled
              />
              <Button size="sm" disabled>
                Update password
              </Button>
            </div>
          </Card>
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-bold text-[var(--foreground)] mb-1">Sign out everywhere</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  End your current session on this device.
                </p>
              </div>
              <Button
                variant="danger"
                size="sm"
                icon={<LogOutIcon size={13} />}
                onClick={() => void handleLogout()}
              >
                Sign out
              </Button>
            </div>
          </Card>
        </div>
      )}

      {tab === 'notifications' && (
        <div className="space-y-4 animate-fade-in">
          <Alert variant="info">
            Email notification preferences aren&apos;t available yet — they&apos;re planned for a future
            release.
          </Alert>
        </div>
      )}

      {tab === 'billing' && (
        <div className="space-y-4 animate-fade-in">
          <Card className="gradient-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[var(--foreground)]">
                    {user.plan === 'premium' ? 'Premium Plan' : 'Free Plan'}
                  </h3>
                  <Badge variant={user.plan === 'premium' ? 'purple' : 'default'}>Current</Badge>
                </div>
                <p className="text-sm text-[var(--muted-foreground)] mt-2">
                  JobCheck is free to use right now — there are no paid tiers or billing yet.
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
