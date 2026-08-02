import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Tabs,
  Alert,
  ZapIcon,
  LinkIcon,
  UploadIcon,
  SearchIcon,
  InfoIcon,
  CheckCircleIcon,
  AlertTriangleIcon,
  XCircleIcon,
  ShieldCheckIcon,
} from '@/components/ui';
import { createAnalysis, createPublicAnalysis } from '@/features/analysis/api/analysis.api';
import { ApiClientError, getAccessToken } from '@/lib/apiClient';

const tips = [
  {
    icon: <CheckCircleIcon size={14} className="text-emerald-500" />,
    text: 'Include the full job description for the most accurate analysis.',
  },
  {
    icon: <AlertTriangleIcon size={14} className="text-amber-500" />,
    text: "Watch for vague salary ranges like '$5K–$15K/week' — a common red flag.",
  },
  {
    icon: <InfoIcon size={14} className="text-blue-500" />,
    text: 'Legitimate companies always use official business email domains.',
  },
  {
    icon: <XCircleIcon size={14} className="text-red-500" />,
    text: "Never pay upfront for training materials or equipment — that's always a scam.",
  },
];

const MIN_TEXT_LENGTH = 20;

export function AnalyzePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const prefill = (location.state as { prefill?: string } | null)?.prefill;

  const [tab, setTab] = useState('paste');
  const [text, setText] = useState(prefill ?? '');
  const [url, setUrl] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState(0);
  const [formError, setFormError] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  const mutation = useMutation({
    // Logged-in users keep hitting the authenticated, persisted endpoint;
    // anonymous visitors transparently fall back to the rate-limited guest
    // endpoint so the same form works without an account.
    mutationFn: (input: { jobText?: string; jobUrl?: string }) =>
      getAccessToken() ? createAnalysis(input) : createPublicAnalysis(input),
    onSuccess: (result) => {
      setProgress(100);
      // Dashboard/Profile cache their own history fetch under the 'analyses'
      // key with a 30s staleTime; without this, navigating back to either
      // page shortly after analyzing shows the pre-analysis count/list.
      void queryClient.invalidateQueries({ queryKey: ['analyses'] });
      navigate(`/analyses/${result.analysis._id}`);
    },
  });

  useEffect(() => {
    if (mutation.isPending) {
      setProgress(8);
      progressTimer.current = setInterval(() => {
        setProgress((p) => (p < 90 ? p + Math.random() * 12 : p));
      }, 350);
    } else if (progressTimer.current) {
      clearInterval(progressTimer.current);
    }
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current);
    };
  }, [mutation.isPending]);

  const handleAnalyze = () => {
    setFormError('');
    if (tab === 'url') {
      // URL analysis is temporarily disabled in the UI — see the "Coming
      // Soon" messaging on this tab. Intentionally never calls mutate().
      return;
    }
    if (text.trim().length < MIN_TEXT_LENGTH) {
      setFormError(`Job description must be at least ${MIN_TEXT_LENGTH} characters.`);
      return;
    }
    mutation.mutate({ jobText: text.trim() });
  };

  const errorMessage =
    formError ||
    (mutation.isError
      ? mutation.error instanceof ApiClientError
        ? mutation.error.message
        : 'Something went wrong. Please try again.'
      : '');

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <div className="mb-8 animate-fade-up">
        <h1
          className="text-2xl font-extrabold text-[var(--foreground)]"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          Analyze a Job Posting
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Paste the full job description or upload a file. We check it against every active
          fraud-signal rule. URL analysis is coming soon.
        </p>
      </div>

      {mutation.isPending ? (
        <Card className="animate-scale-in">
          <div className="py-12 flex flex-col items-center text-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[var(--primary)]/10 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <ShieldCheckIcon size={32} className="text-white" />
              </div>
            </div>
            <div>
              <h2
                className="text-xl font-bold text-[var(--foreground)] mb-2"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Analyzing job posting…
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Running the fraud-detection rule engine
              </p>
            </div>
            <div className="w-full max-w-sm space-y-3">
              <div className="h-2.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <Card padding="none" className="animate-fade-up">
              <div className="px-4 pt-4 pb-0">
                <Tabs
                  active={tab}
                  onChange={setTab}
                  tabs={[
                    { id: 'paste', label: 'Paste text', icon: <ZapIcon size={14} /> },
                    { id: 'url', label: 'Submit URL (Coming Soon)', icon: <LinkIcon size={14} /> },
                    { id: 'upload', label: 'Upload file', icon: <UploadIcon size={14} /> },
                  ]}
                />
              </div>

              <div className="p-4">
                {tab === 'paste' && (
                  <div
                    className={`relative transition-all ${dragOver ? 'ring-2 ring-[var(--primary)] ring-offset-2 rounded-xl' : ''}`}
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDragOver(false);
                      const file = e.dataTransfer.files[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => setText((ev.target?.result as string) ?? '');
                        reader.readAsText(file);
                      }
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste the full job description here…"
                      className="w-full h-72 p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors font-mono leading-relaxed"
                      style={{ fontFamily: 'var(--font-mono)', fontSize: '13px' }}
                    />
                    {dragOver && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--primary)]/5 border-2 border-dashed border-[var(--primary)]">
                        <div className="text-center">
                          <UploadIcon size={28} className="text-[var(--primary)] mx-auto mb-2" />
                          <p className="text-sm font-semibold text-[var(--primary)]">
                            Drop file to import
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === 'url' && (
                  <div className="space-y-4">
                    <div className="relative flex items-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] opacity-60">
                      <SearchIcon
                        size={16}
                        className="absolute left-3.5 text-[var(--muted-foreground)]"
                      />
                      <input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Coming soon"
                        disabled
                        className="w-full pl-10 pr-4 py-3.5 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none cursor-not-allowed"
                      />
                    </div>
                    <Alert variant="info" title="URL analysis coming soon">
                      We're not ready to reliably analyze job postings from a link yet. Paste the
                      full job description text or upload a file instead — both are fully supported
                      today.
                    </Alert>
                  </div>
                )}

                {tab === 'upload' && (
                  <div
                    onClick={() => document.getElementById('file-input')?.click()}
                    className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] transition-colors cursor-pointer group"
                  >
                    <input
                      id="file-input"
                      type="file"
                      accept=".txt"
                      className="sr-only"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            setText((ev.target?.result as string) ?? '');
                            setTab('paste');
                          };
                          reader.readAsText(file);
                        }
                      }}
                    />
                    <UploadIcon
                      size={28}
                      className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors mb-3"
                    />
                    <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      Click to upload
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">
                      Plain text (.txt) files
                    </p>
                  </div>
                )}
              </div>

              {errorMessage && (
                <div className="px-4 pb-2">
                  <Alert variant="error">{errorMessage}</Alert>
                </div>
              )}

              <div className="px-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {tab === 'paste' && (
                    <>
                      <span className="text-xs text-[var(--muted-foreground)] font-mono">
                        {text.length.toLocaleString()} chars
                      </span>
                      {text && (
                        <button
                          onClick={() => setText('')}
                          className="text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
                        >
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>
                <Button
                  size="md"
                  icon={<ZapIcon size={15} />}
                  onClick={handleAnalyze}
                  disabled={(tab === 'paste' && !text.trim()) || tab === 'url'}
                  className="min-w-[140px]"
                >
                  Analyze now
                </Button>
              </div>
            </Card>
          </div>

          <div className="space-y-4 animate-fade-up stagger-2">
            <Card>
              <h3 className="font-bold text-[var(--foreground)] mb-4 flex items-center gap-2">
                <InfoIcon size={16} className="text-[var(--primary)]" />
                Analysis tips
              </h3>
              <div className="space-y-3.5">
                {tips.map((tip, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex-shrink-0 mt-0.5">{tip.icon}</span>
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                      {tip.text}
                    </p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-[var(--primary)] border-0">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon size={16} className="text-indigo-200" />
                <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">
                  How scoring works
                </span>
              </div>
              <p className="text-sm text-white leading-relaxed">
                Every matched rule contributes a weight toward your risk score. More and stronger
                signals push the score toward Critical.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
