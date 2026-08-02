import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  RiskBadge,
  Skeleton,
  Button,
  EmptyState,
  Alert,
  ShieldCheckIcon,
  ZapIcon,
  AlertTriangleIcon,
  ClockIcon,
  ArrowRightIcon,
  BarChartIcon,
  CheckCircleIcon,
  XCircleIcon,
  BriefcaseIcon,
} from '@/components/ui';
import type { RiskLevel as UiRiskLevel } from '@/components/ui';
import { MAX_HISTORY_PAGE_SIZE, getAnalysisHistory } from '@/features/analysis/api/analysis.api';
import { useAuth } from '@/features/auth/AuthContext';
import { useGoToAnalyzer } from '@/hooks/useGoToAnalyzer';

const STATS_SAMPLE_SIZE = MAX_HISTORY_PAGE_SIZE;

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return 'Yesterday';
  return `${days} days ago`;
}

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const goToAnalyzer = useGoToAnalyzer();

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['analyses', 'dashboard'],
    queryFn: () => getAnalysisHistory(1, STATS_SAMPLE_SIZE),
  });

  const items = useMemo(() => data?.items ?? [], [data]);

  const stats = useMemo(() => {
    const scams = items.filter(
      ({ analysis }) => analysis.riskLevel === 'high' || analysis.riskLevel === 'critical',
    ).length;
    const safe = items.filter(({ analysis }) => analysis.riskLevel === 'low').length;
    return { scams, safe };
  }, [items]);

  const riskDistribution = useMemo(() => {
    const total = items.length || 1;
    const counts = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const { analysis } of items) counts[analysis.riskLevel]++;
    return [
      { label: 'Low', pct: Math.round((counts.low / total) * 100), color: 'bg-blue-500' },
      { label: 'Medium', pct: Math.round((counts.medium / total) * 100), color: 'bg-amber-500' },
      { label: 'High', pct: Math.round((counts.high / total) * 100), color: 'bg-orange-500' },
      { label: 'Critical', pct: Math.round((counts.critical / total) * 100), color: 'bg-red-500' },
    ];
  }, [items]);

  const recent = items.slice(0, 5);
  const firstName = user?.name.split(' ')[0] ?? '';

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {isError && (
        <Alert variant="error" title="Couldn't load your analyses">
          {error instanceof Error ? error.message : 'Something went wrong loading your history.'}
        </Alert>
      )}

      <div className="animate-fade-up">
        <h1
          className="text-2xl font-extrabold text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Here's your job safety overview
          {data ? (
            <>
              {' '}
              — <span className="font-medium text-[var(--foreground)]">
                {data.total} analyses
              </span>{' '}
              total.
            </>
          ) : (
            '.'
          )}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="animate-fade-up">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)] font-medium mb-1">
                Total analyses
              </p>
              <p
                className="text-3xl font-bold text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isLoading ? <Skeleton className="h-9 w-12" /> : (data?.total ?? 0)}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
              <BarChartIcon size={20} />
            </div>
          </div>
        </Card>
        <Card className="animate-fade-up stagger-1">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)] font-medium mb-1">
                High/critical risk
              </p>
              <p
                className="text-3xl font-bold text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.scams}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400">
              <ShieldCheckIcon size={20} />
            </div>
          </div>
        </Card>
        <Card className="animate-fade-up stagger-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-[var(--muted-foreground)] font-medium mb-1">Low risk</p>
              <p
                className="text-3xl font-bold text-[var(--foreground)]"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                {isLoading ? <Skeleton className="h-9 w-12" /> : stats.safe}
              </p>
            </div>
            <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
              <CheckCircleIcon size={20} />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 animate-fade-up stagger-2">
          <Card padding="none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h2 className="font-bold text-[var(--foreground)]">Recent Analyses</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                  Your most recent job scans
                </p>
              </div>
            </div>

            {isLoading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-14 rounded-xl" />
                ))}
              </div>
            ) : recent.length === 0 ? (
              <EmptyState
                icon={<BriefcaseIcon />}
                title="No analyses yet"
                description="Paste a job posting to run your first scam-risk check."
                action={
                  <Button size="sm" icon={<ZapIcon size={14} />} onClick={() => goToAnalyzer()}>
                    Analyze a job
                  </Button>
                }
              />
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recent.map(({ analysis }) => {
                  const uiLevel: UiRiskLevel = analysis.riskLevel;
                  return (
                    <div
                      key={analysis._id}
                      onClick={() => navigate(`/analyses/${analysis._id}`)}
                      className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--muted)]/40 cursor-pointer transition-colors group"
                    >
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                        ${
                          uiLevel === 'low'
                            ? 'bg-emerald-50 dark:bg-emerald-950/40'
                            : uiLevel === 'medium'
                              ? 'bg-amber-50 dark:bg-amber-950/40'
                              : uiLevel === 'critical'
                                ? 'bg-red-50 dark:bg-red-950/40'
                                : 'bg-orange-50 dark:bg-orange-950/40'
                        }`}
                      >
                        {uiLevel === 'low' ? (
                          <ShieldCheckIcon size={18} className="text-emerald-600" />
                        ) : uiLevel === 'critical' ? (
                          <XCircleIcon size={18} className="text-red-600" />
                        ) : (
                          <AlertTriangleIcon
                            size={18}
                            className={uiLevel === 'medium' ? 'text-amber-600' : 'text-orange-600'}
                          />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                          {analysis.extractedFields.jobTitle ?? 'Job posting analysis'}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
                          <BriefcaseIcon size={10} />
                          {analysis.extractedFields.companyName ?? 'Unknown company'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <RiskBadge level={uiLevel} />
                        <div className="hidden sm:flex flex-col items-end gap-0.5">
                          <span className="text-sm font-bold text-[var(--foreground)]">
                            {analysis.riskScore}
                          </span>
                          <span className="text-xs text-[var(--muted-foreground)]">score</span>
                        </div>
                        <span className="text-xs text-[var(--muted-foreground)] hidden md:block">
                          {relativeTime(analysis.createdAt)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="px-6 py-4 border-t border-[var(--border)]">
              <Button
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => goToAnalyzer()}
                icon={<ZapIcon size={14} />}
              >
                Analyze a new job posting
              </Button>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="animate-fade-up stagger-3">
            <h3 className="font-bold text-[var(--foreground)] mb-4">Risk Distribution</h3>
            {items.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No data yet.</p>
            ) : (
              <div className="space-y-3">
                {riskDistribution.map((r) => (
                  <div key={r.label} className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-[var(--muted-foreground)] font-medium">{r.label}</span>
                      <span className="text-[var(--foreground)] font-semibold">{r.pct}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.color} transition-all duration-700`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="animate-fade-up stagger-4">
            <h3 className="font-bold text-[var(--foreground)] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                {
                  label: 'Analyze a job',
                  icon: <ZapIcon size={15} />,
                  to: '/analyze',
                  color: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40',
                },
                {
                  label: 'Browse knowledge base',
                  icon: <BriefcaseIcon size={15} />,
                  to: '/knowledge-base',
                  color: 'bg-blue-50 text-blue-600 dark:bg-blue-950/40',
                },
                {
                  label: 'Profile & security',
                  icon: <ShieldCheckIcon size={15} />,
                  to: '/profile',
                  color: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40',
                },
              ].map((q) => (
                <button
                  key={q.label}
                  onClick={() => navigate(q.to)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors group text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${q.color}`}>
                    {q.icon}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {q.label}
                  </span>
                  <ArrowRightIcon
                    size={13}
                    className="ml-auto text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-all"
                  />
                </button>
              ))}
            </div>
          </Card>

          {recent.length > 0 && (
            <Card className="animate-fade-up stagger-5">
              <h3 className="font-bold text-[var(--foreground)] mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {recent.map(({ analysis }) => (
                  <div key={analysis._id} className="flex items-start gap-3">
                    <div className="mt-0.5 text-indigo-500 flex-shrink-0">
                      <ZapIcon size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-[var(--foreground)] leading-snug">
                        Analyzed '
                        {analysis.extractedFields.jobTitle ??
                          analysis.extractedFields.companyName ??
                          'a job posting'}
                        '
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                        <ClockIcon size={9} />
                        {relativeTime(analysis.createdAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
