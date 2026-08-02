import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  Badge,
  Button,
  Alert,
  Modal,
  RiskBadge,
  Tabs,
  Skeleton,
  ShieldCheckIcon,
  AlertTriangleIcon,
  CheckCircleIcon,
  CopyIcon,
  ShareIcon,
  InfoIcon,
  ChevronDownIcon,
  ZapIcon,
  ClockIcon,
  SearchIcon,
  SparklesIcon,
} from '@/components/ui';
import type { RiskLevel as UiRiskLevel } from '@/components/ui';
import { getAnalysisById, getPublicReport } from '@/features/analysis/api/analysis.api';
import { parseRedFlagDescription } from '@/features/analysis/parseRedFlag';
import type { GreenFlag, RedFlag, RiskLevel } from '@/features/analysis/types';
import { useAuth } from '@/features/auth/AuthContext';
import { useGoToAnalyzer } from '@/hooks/useGoToAnalyzer';

// Normalized view both queryFns below map into, so all rendering code stays
// source-agnostic. Deliberately mirrors only the fields this page renders.
interface DisplayReport {
  riskScore: number;
  riskLevel: RiskLevel;
  redFlags: RedFlag[];
  greenFlags: GreenFlag[];
  createdAt: string;
  engineVersion: string;
  jobTitle: string | null;
  companyName: string | null;
  aiExplanation: string | null;
  aiConfidence: number | null;
}

function toUiRiskLevel(level: RiskLevel, score: number): UiRiskLevel {
  if (level === 'low' && score < 10) return 'safe';
  return level;
}

function humanizeLabel(label: string): string {
  return label
    .toLowerCase()
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

const severityWeight: Record<'low' | 'medium' | 'high', number> = { low: 1, medium: 2, high: 3 };

export function ResultsPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const goToAnalyzer = useGoToAnalyzer();
  const [tab, setTab] = useState('overview');
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [shareModal, setShareModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  // This component is mounted at two different paths: the public, guest-
  // reachable /results/:id (no auth, no ownership check — used for the
  // guest's own result AND for anyone opening a shared report link) and the
  // protected /analyses/:id (a logged-in user's own history, ownership-
  // checked). Which one decides which endpoint is safe to call.
  const isPublicRoute = location.pathname.startsWith('/results/');

  const ownerQuery = useQuery({
    queryKey: ['analysis', id],
    queryFn: () => getAnalysisById(id!),
    enabled: Boolean(id) && !isPublicRoute,
  });

  const publicQuery = useQuery({
    queryKey: ['report', id],
    queryFn: () => getPublicReport(id!),
    enabled: Boolean(id) && isPublicRoute,
  });

  const isLoading = isPublicRoute ? publicQuery.isLoading : ownerQuery.isLoading;
  const isError = isPublicRoute ? publicQuery.isError : ownerQuery.isError;

  const ownerAnalysis = ownerQuery.data?.analysis;
  const publicReport = publicQuery.data?.report;

  const report: DisplayReport | undefined = useMemo(() => {
    if (isPublicRoute) return publicReport;
    if (!ownerAnalysis) return undefined;
    return {
      riskScore: ownerAnalysis.riskScore,
      riskLevel: ownerAnalysis.riskLevel,
      redFlags: ownerAnalysis.redFlags,
      greenFlags: ownerAnalysis.greenFlags,
      createdAt: ownerAnalysis.createdAt,
      engineVersion: ownerAnalysis.engineVersion,
      jobTitle: ownerAnalysis.extractedFields.jobTitle,
      companyName: ownerAnalysis.extractedFields.companyName,
      aiExplanation: ownerAnalysis.aiExplanation,
      aiConfidence: ownerAnalysis.aiConfidence,
    };
  }, [isPublicRoute, publicReport, ownerAnalysis]);

  const parsedFlags = useMemo(
    () =>
      (report?.redFlags ?? [])
        .map((flag) => ({ flag, parsed: parseRedFlagDescription(flag.description) }))
        .sort((a, b) => severityWeight[b.flag.severity] - severityWeight[a.flag.severity]),
    [report],
  );

  const severityCounts = useMemo(() => {
    const counts = { high: 0, medium: 0, low: 0 };
    for (const { flag } of parsedFlags) counts[flag.severity]++;
    return counts;
  }, [parsedFlags]);

  const uniqueRecommendations = useMemo(() => {
    const seen = new Set<string>();
    const results: { recommendation: string; severity: 'low' | 'medium' | 'high' }[] = [];
    for (const { flag, parsed } of parsedFlags) {
      if (parsed.recommendation && !seen.has(parsed.recommendation)) {
        seen.add(parsed.recommendation);
        results.push({ recommendation: parsed.recommendation, severity: flag.severity });
      }
    }
    return results;
  }, [parsedFlags]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (isError || !report) {
    return (
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <Alert variant="error" title="Couldn't load this analysis">
          It may not exist, or you may not have access to it.
        </Alert>
      </div>
    );
  }

  const score = report.riskScore;
  const uiRiskLevel = toUiRiskLevel(report.riskLevel, score);
  const dashOffset = 283 - (283 * score) / 100;
  const title = report.jobTitle ?? 'Job posting analysis';
  const company = report.companyName ?? 'Unknown company';
  const shareUrl = `${window.location.origin}/results/${id}`;

  const handleCopyLink = () => {
    void navigator.clipboard
      .writeText(shareUrl)
      .then(() => {
        setLinkCopied(true);
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard permission denied/unavailable — the modal still shows
        // the link itself so it can be copied manually.
      });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level={uiRiskLevel} />
            <span className="text-xs text-[var(--muted-foreground)]">
              Analyzed {new Date(report.createdAt).toLocaleString()}
            </span>
          </div>
          <h1
            className="text-2xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            {title}
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">{company}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            icon={<ShareIcon size={14} />}
            onClick={() => setShareModal(true)}
          >
            Share Report
          </Button>
          <Button size="sm" icon={<ZapIcon size={14} />} onClick={() => goToAnalyzer()}>
            New scan
          </Button>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'indicators', label: `Indicators (${parsedFlags.length})` },
          { id: 'recommendations', label: 'Recommendations' },
          { id: 'timeline', label: 'Timeline' },
        ]}
        className="animate-fade-up stagger-1"
      />

      {tab === 'overview' && (
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
          <Card className="flex flex-col items-center text-center gap-4 lg:col-span-1">
            <div className="relative w-44 h-44">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--muted)" strokeWidth="10" />
                <circle
                  cx="60"
                  cy="60"
                  r="45"
                  fill="none"
                  stroke="url(#scoreGrad)"
                  strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={dashOffset}
                  style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)' }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span
                  className="text-5xl font-extrabold text-[var(--foreground)]"
                  style={{ fontFamily: 'var(--font-display)' }}
                >
                  {score}
                </span>
                <span className="text-sm text-[var(--muted-foreground)] font-medium">
                  risk score
                </span>
              </div>
            </div>
            <div>
              <RiskBadge level={uiRiskLevel} />
              <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">
                {report.riskLevel === 'critical' || report.riskLevel === 'high' ? (
                  <>
                    This posting shows strong indicators of fraud. We recommend{' '}
                    <strong>not applying</strong>.
                  </>
                ) : report.riskLevel === 'medium' ? (
                  'This posting shows some signals worth reviewing before applying.'
                ) : (
                  'No strong fraud signals were detected in this posting.'
                )}
              </p>
            </div>
            <div className="w-full">
              <div className="relative h-3 rounded-full overflow-hidden risk-gradient mb-2">
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white/80 shadow-sm transition-all duration-700"
                  style={{ left: `${score}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                <span>Safe</span>
                <span>Critical</span>
              </div>
            </div>
          </Card>

          <div className="lg:col-span-2 space-y-4">
            {parsedFlags.length > 0 ? (
              <Alert
                variant={
                  report.riskLevel === 'critical' || report.riskLevel === 'high'
                    ? 'error'
                    : 'warning'
                }
                title={
                  report.riskLevel === 'critical' || report.riskLevel === 'high'
                    ? 'Proceed with caution'
                    : 'A few things to review'
                }
              >
                We detected {parsedFlags.length} fraud signal{parsedFlags.length === 1 ? '' : 's'}{' '}
                in this posting.
              </Alert>
            ) : (
              <Alert variant="success" title="No red flags detected">
                None of our active detection rules matched this posting. Still use your own judgment
                before applying.
              </Alert>
            )}

            <Card>
              <h3 className="font-bold text-[var(--foreground)] mb-4">Signal Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: 'High signals', count: severityCounts.high, bar: 'bg-orange-500' },
                  { label: 'Medium signals', count: severityCounts.medium, bar: 'bg-amber-500' },
                  { label: 'Low signals', count: severityCounts.low, bar: 'bg-blue-500' },
                ].map((s) => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-[var(--muted-foreground)]">{s.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div
                        className={`h-full rounded-full ${s.bar}`}
                        style={{
                          width: `${parsedFlags.length ? (s.count / parsedFlags.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                    <span className="w-4 text-sm font-semibold text-[var(--foreground)] text-right">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </Card>

            {parsedFlags.length > 0 && (
              <Card>
                <h3 className="font-bold text-[var(--foreground)] mb-4">Key Red Flags</h3>
                <div className="space-y-2.5">
                  {parsedFlags.slice(0, 4).map(({ flag, parsed }, i) => (
                    <div key={i} className="flex items-start gap-3">
                      {flag.severity === 'high' ? (
                        <AlertTriangleIcon
                          size={16}
                          className="text-orange-500 flex-shrink-0 mt-0.5"
                        />
                      ) : flag.severity === 'medium' ? (
                        <InfoIcon size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                      ) : (
                        <InfoIcon size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
                      )}
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {humanizeLabel(flag.label)}
                        </p>
                        {parsed.evidence && (
                          <p className="text-xs text-[var(--muted-foreground)] mt-0.5 italic">
                            Evidence: {parsed.evidence}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                {parsedFlags.length > 4 && (
                  <button
                    onClick={() => setTab('indicators')}
                    className="mt-4 text-sm font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
                  >
                    View all {parsedFlags.length} indicators
                  </button>
                )}
              </Card>
            )}

            {/* Only rendered when Gemini produced an explanation — absent
                (report.aiExplanation === null) whenever the AI layer isn't
                configured or a call failed, so the page is identical to the
                rule-engine-only experience in that case. */}
            {report.aiExplanation && (
              <Card>
                <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                  <SparklesIcon size={16} className="text-[var(--primary)]" />
                  AI Analysis
                </h3>
                <div className="space-y-3">
                  {report.aiExplanation.split('\n\n').map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-sm text-[var(--foreground)] leading-relaxed whitespace-pre-line"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                {report.aiConfidence !== null && (
                  <p className="mt-4 text-xs text-[var(--muted-foreground)]">
                    Confidence:{' '}
                    <span className="font-semibold text-[var(--foreground)]">
                      {report.aiConfidence >= 0.75
                        ? 'High'
                        : report.aiConfidence >= 0.4
                          ? 'Medium'
                          : 'Low'}
                    </span>{' '}
                    ({Math.round(report.aiConfidence * 100)}%)
                  </p>
                )}
              </Card>
            )}
          </div>
        </div>
      )}

      {tab === 'indicators' && (
        <div className="space-y-3 animate-fade-in">
          {parsedFlags.length === 0 ? (
            <Alert variant="success">No fraud signals were detected in this posting.</Alert>
          ) : (
            <>
              <p className="text-sm text-[var(--muted-foreground)]">
                {parsedFlags.length} fraud signal{parsedFlags.length === 1 ? '' : 's'} detected ·
                Click each to expand evidence
              </p>
              {parsedFlags.map(({ flag, parsed }, i) => {
                const open = expandedIndex === i;
                const sev =
                  flag.severity === 'high'
                    ? {
                        color: 'text-orange-600',
                        bg: 'bg-orange-50 dark:bg-orange-950/30',
                        border: 'border-orange-200 dark:border-orange-900',
                        badge: 'danger' as const,
                      }
                    : flag.severity === 'medium'
                      ? {
                          color: 'text-amber-600',
                          bg: 'bg-amber-50 dark:bg-amber-950/30',
                          border: 'border-amber-200 dark:border-amber-900',
                          badge: 'warning' as const,
                        }
                      : {
                          color: 'text-blue-600',
                          bg: 'bg-blue-50 dark:bg-blue-950/30',
                          border: 'border-blue-200 dark:border-blue-900',
                          badge: 'info' as const,
                        };
                return (
                  <div
                    key={i}
                    className={`rounded-2xl border ${sev.border} ${sev.bg} overflow-hidden`}
                  >
                    <button
                      onClick={() => setExpandedIndex(open ? null : i)}
                      className="w-full flex items-center gap-4 px-5 py-4 text-left"
                    >
                      <div className={`flex-shrink-0 ${sev.color}`}>
                        {flag.severity === 'high' ? (
                          <AlertTriangleIcon size={20} />
                        ) : (
                          <InfoIcon size={20} />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-[var(--foreground)]">
                            {humanizeLabel(flag.label)}
                          </span>
                          <Badge variant={sev.badge}>{flag.severity}</Badge>
                          {parsed.category && (
                            <span className="text-xs text-[var(--muted-foreground)]">
                              {parsed.category}
                            </span>
                          )}
                        </div>
                      </div>
                      <ChevronDownIcon
                        size={16}
                        className={`flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
                      />
                    </button>
                    {open && (
                      <div className="px-5 pb-5 border-t border-current/10 space-y-3 animate-fade-in">
                        <p className="text-sm text-[var(--foreground)] leading-relaxed">
                          {parsed.summary}
                        </p>
                        {parsed.evidence && (
                          <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3">
                            <p className="text-xs text-[var(--muted-foreground)] font-semibold mb-1">
                              Evidence from posting:
                            </p>
                            <p className="text-sm font-mono text-[var(--foreground)] italic">
                              {parsed.evidence}
                            </p>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-4 animate-fade-in">
          {uniqueRecommendations.length === 0 ? (
            <Alert variant="success">
              No specific recommendations — no red flags were detected.
            </Alert>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {uniqueRecommendations.map((r, i) => (
                <Card key={i} hover>
                  <Badge
                    variant={
                      r.severity === 'high'
                        ? 'danger'
                        : r.severity === 'medium'
                          ? 'warning'
                          : 'info'
                    }
                    className="mb-3"
                  >
                    {r.severity} priority
                  </Badge>
                  <p className="text-sm text-[var(--foreground)] leading-relaxed">
                    {r.recommendation}
                  </p>
                </Card>
              ))}
            </div>
          )}

          {/* Knowledge Base is an authenticated-only page — offering this to
              a guest on the public /results/:id route would bounce them to
              /login when clicked, which is exactly the class of leak this
              page must never have. */}
          {user && (
            <Card className="border-[var(--primary)] gradient-border">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-xl bg-[var(--secondary)] flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon size={18} className="text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="font-bold text-[var(--foreground)] mb-1">
                    Find legitimate opportunities
                  </h3>
                  <p className="text-sm text-[var(--muted-foreground)] mb-3">
                    Browse the Knowledge Base to research companies and recruiters before applying.
                  </p>
                  <Button size="sm" variant="secondary" onClick={() => navigate('/knowledge-base')}>
                    Browse Knowledge Base
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {tab === 'timeline' && (
        <Card className="animate-fade-in">
          <h3 className="font-bold text-[var(--foreground)] mb-6">Analysis Timeline</h3>
          <div className="relative pl-8 space-y-8">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--border)]" />
            {[
              { label: 'Job posting submitted', icon: <SearchIcon size={14} /> },
              {
                label: `Rule evaluation completed (${report.engineVersion})`,
                icon: <ZapIcon size={14} />,
              },
              {
                label: `Risk score calculated: ${score} / 100`,
                icon: <ShieldCheckIcon size={14} />,
              },
              { label: 'Report ready', icon: <CheckCircleIcon size={14} /> },
            ].map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-5 w-4 h-4 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] flex items-center justify-center">
                  <span className="text-white scale-75">{t.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)] text-sm">{t.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                    <ClockIcon size={10} />
                    {new Date(report.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal open={shareModal} onClose={() => setShareModal(false)} title="Share Report">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Anyone with this link can view this report's risk score, flags, and recommendations — no
            account needed.
          </p>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]">
            <span className="flex-1 text-sm text-[var(--foreground)] font-mono truncate">
              {shareUrl}
            </span>
            <Button size="sm" icon={<CopyIcon size={14} />} onClick={handleCopyLink}>
              {linkCopied ? 'Copied!' : 'Copy link'}
            </Button>
          </div>
          {linkCopied && <Alert variant="success">Report link copied</Alert>}
        </div>
      </Modal>
    </div>
  );
}
