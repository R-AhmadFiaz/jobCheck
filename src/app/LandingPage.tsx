'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMutation } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  ZapIcon,
  SearchIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ChevronDownIcon,
  ShieldAlertIcon,
  GlobeIcon,
  UsersIcon,
  TrendingUpIcon,
  SunIcon,
  MoonIcon,
  CheckIcon,
  AlertTriangleIcon,
  XCircleIcon,
  UploadIcon,
  XIcon,
  Spinner,
  Alert,
  Card,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { useDarkMode } from '@/hooks/useDarkMode';
import { createPublicAnalysis } from '@/features/analysis/api/analysis.api';
import { ApiClientError } from '@/lib/apiClient';
import { useGoToAnalyzer } from '@/hooks/useGoToAnalyzer';
import { ContactForm } from '@/features/contact/ContactForm';

const features = [
  {
    icon: <ZapIcon size={22} className="text-indigo-500" />,
    title: 'Instant Analysis',
    desc: 'Paste any job description and get a rule-based scam-risk report in seconds.',
    bg: 'bg-indigo-50 dark:bg-indigo-950/40',
  },
  {
    icon: <ShieldAlertIcon size={22} className="text-amber-500" />,
    title: 'Pattern Detection',
    desc: 'A growing, admin-curated rule set flags upfront-payment requests, urgency pressure tactics, generic contact emails, and more.',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
  },
  {
    icon: <GlobeIcon size={22} className="text-blue-500" />,
    title: 'Paste text or upload a file',
    desc: 'Submit the full posting as text or upload a PDF, DOC, DOCX, or TXT file. URL analysis is coming soon.',
    bg: 'bg-blue-50 dark:bg-blue-950/40',
  },
  {
    icon: <UsersIcon size={22} className="text-emerald-500" />,
    title: 'Built for job seekers',
    desc: 'Free to use, no credit card required, with clear evidence and recommendations for every flag.',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
  },
  {
    icon: <TrendingUpIcon size={22} className="text-violet-500" />,
    title: 'Transparent scoring',
    desc: 'Every risk score is explained — see exactly which signals were detected and why.',
    bg: 'bg-violet-50 dark:bg-violet-950/40',
  },
  {
    icon: <SearchIcon size={22} className="text-rose-500" />,
    title: 'Your analysis history',
    desc: 'Every posting you check is saved to your dashboard so you can revisit it any time.',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
  },
];

const steps = [
  {
    num: '01',
    title: 'Paste or upload',
    desc: 'Drop in the full job description or upload a file.',
  },
  {
    num: '02',
    title: 'Rules run instantly',
    desc: 'Our detection engine checks the text against every active fraud-signal rule.',
  },
  {
    num: '03',
    title: 'Get your report',
    desc: 'Receive a clear risk score, flagged indicators, and actionable recommendations.',
  },
];

const faqs = [
  {
    q: 'How does the risk analysis work?',
    a: 'JobCheck runs the posting through a set of admin-curated rules — checks for upfront-payment requests, unrealistic salary claims, generic contact emails, urgency language, and vague company information — and combines the matches into a single risk score.',
  },
  {
    q: 'Is my job description data stored?',
    a: 'Yes — analyses are saved to your account so you can review your history. We do not sell or share this data.',
  },
  {
    q: 'Can I analyze a job from a URL?',
    a: 'URL analysis is coming soon. For now, paste the full job description text or upload a file (PDF, DOC, DOCX, or TXT) — both give a complete analysis today.',
  },
  {
    q: 'Can I use JobCheck for free?',
    a: 'Yes — JobCheck is free to use right now. There are no usage limits or paid tiers yet.',
  },
];

export function LandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dark, toggleDark] = useDarkMode();
  const { user } = useAuth();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroInputRef = useRef<HTMLInputElement>(null);

  const goToApp = () => router.push(user ? '/dashboard' : '/register');
  const goToAnalyzer = useGoToAnalyzer();

  // This box always goes straight to the public endpoint and lands on the
  // results page directly — no intermediate Analyze form, no auth check,
  // regardless of login state. It is intentionally NOT auth-aware: even a
  // logged-in user typing here gets the instant, unsaved public result
  // (same as a guest). Logged-in users who want their analysis saved to
  // their account history use the Dashboard's "Analyze" button instead,
  // which goes through useGoToAnalyzer to the authenticated /analyze page.
  const publicAnalysisMutation = useMutation({
    mutationFn: createPublicAnalysis,
    onSuccess: (result) => {
      router.push(`/results/${result.analysis._id}`);
    },
  });

  const hasInput = Boolean(input.trim()) || file !== null;

  const handleAnalyze = () => {
    if (!hasInput || publicAnalysisMutation.isPending) return;
    const trimmed = input.trim();

    // URL analysis is temporarily disabled — always submit as description
    // text, even if the user pastes something that looks like a URL.
    publicAnalysisMutation.mutate({
      jobText: trimmed || undefined,
      file: file ?? undefined,
    });
  };

  const handleFileSelect = (selected: File | null) => {
    setFile(selected);
    publicAnalysisMutation.reset();
  };

  const analyzeError =
    publicAnalysisMutation.error instanceof ApiClientError
      ? publicAnalysisMutation.error.message
      : publicAnalysisMutation.isError
        ? 'Something went wrong. Please try again.'
        : '';

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <ShieldCheckIcon size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
              JobCheck
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted-foreground)]">
            <a href="#features" className="hover:text-[var(--foreground)] transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="hover:text-[var(--foreground)] transition-colors">
              How it works
            </a>
            <a href="#faq" className="hover:text-[var(--foreground)] transition-colors">
              FAQ
            </a>
            <a href="#contact" className="hover:text-[var(--foreground)] transition-colors">
              Contact
            </a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleDark}
              className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]"
            >
              {dark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
            {user ? (
              <button
                onClick={() => router.push('/dashboard')}
                className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
              >
                Go to dashboard
              </button>
            ) : (
              <>
                <button
                  onClick={() => router.push('/login')}
                  className="px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors"
                >
                  Sign in
                </button>
                <button
                  onClick={() => router.push('/register')}
                  className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
                >
                  Get started
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-mesh relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              'linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="flex flex-col items-center text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--muted-foreground)] mb-8 animate-fade-up shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Free to use —{' '}
              <span className="text-[var(--primary)] font-semibold">no credit card needed</span>
            </div>

            <h1
              className="text-5xl md:text-7xl font-extrabold text-[var(--foreground)] max-w-4xl leading-tight animate-fade-up stagger-1"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.03em' }}
            >
              Don&apos;t get scammed <span className="gradient-text">applying for jobs.</span>
            </h1>

            <p className="mt-6 text-xl text-[var(--muted-foreground)] max-w-2xl leading-relaxed animate-fade-up stagger-2">
              JobCheck checks job postings for common fraud signals — so you can apply with
              confidence, not anxiety.
            </p>

            <div className="mt-10 w-full max-w-2xl animate-fade-up stagger-3">
              <div className="relative flex items-center gap-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg">
                <SearchIcon
                  size={18}
                  className="ml-3 text-[var(--muted-foreground)] flex-shrink-0"
                />
                <input
                  ref={heroInputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAnalyze()}
                  placeholder="Paste a job description…"
                  disabled={publicAnalysisMutation.isPending}
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none py-2 pr-2 disabled:opacity-60"
                />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.pdf,.doc,.docx"
                  className="sr-only"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] ?? null)}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={publicAnalysisMutation.isPending}
                  title="Attach a file (PDF, DOC, DOCX, TXT)"
                  className={`flex-shrink-0 p-2.5 rounded-xl transition-colors disabled:opacity-50 ${
                    file
                      ? 'bg-[var(--primary)]/10 text-[var(--primary)]'
                      : 'text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]'
                  }`}
                >
                  <UploadIcon size={16} />
                </button>
                <button
                  onClick={handleAnalyze}
                  disabled={!hasInput || publicAnalysisMutation.isPending}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:brightness-110 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {publicAnalysisMutation.isPending ? <Spinner size={14} /> : <ZapIcon size={14} />}
                  {publicAnalysisMutation.isPending ? 'Analyzing…' : 'Analyze'}
                </button>
              </div>

              {file && !publicAnalysisMutation.isPending && (
                <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--muted)] text-xs text-[var(--foreground)] animate-fade-in">
                  <UploadIcon size={12} className="text-[var(--muted-foreground)]" />
                  <span className="max-w-[220px] truncate">{file.name}</span>
                  <button
                    onClick={() => handleFileSelect(null)}
                    className="text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors"
                    title="Remove file"
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              )}

              {analyzeError && (
                <div className="mt-3">
                  <Alert variant="error">{analyzeError}</Alert>
                </div>
              )}

              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                {user
                  ? 'Free · No credit card · Saved to your dashboard'
                  : 'Free · No credit card · Works instantly, no account needed'}
              </p>
            </div>
          </div>

          {/* Hero illustration */}
          <div className="mt-16 flex justify-center animate-fade-up stagger-5">
            <div className="relative w-full max-w-3xl">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden">
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-[var(--muted-foreground)] font-mono">
                    jobcheck example report
                  </span>
                </div>
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          fill="none"
                          stroke="var(--muted)"
                          strokeWidth="10"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="48"
                          fill="none"
                          stroke="url(#riskGrad)"
                          strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray="301.6"
                          strokeDashoffset="90"
                        />
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EF4444" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span
                          className="text-4xl font-extrabold text-[var(--foreground)]"
                          style={{ fontFamily: 'var(--font-display)' }}
                        >
                          72
                        </span>
                        <span className="text-xs text-[var(--muted-foreground)] font-medium">
                          risk score
                        </span>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      ● High Risk
                    </span>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-4">
                      Example detected signals
                    </p>
                    {[
                      { label: 'Upfront payment requested', level: 'critical' },
                      { label: 'Generic email domain (gmail.com)', level: 'high' },
                      { label: 'Urgency / pressure language', level: 'high' },
                      { label: 'Unrealistic earnings claim', level: 'medium' },
                    ].map(({ label, level }) => (
                      <div key={label} className="flex items-center gap-3">
                        {level === 'critical' ? (
                          <XCircleIcon size={15} className="text-red-500 flex-shrink-0" />
                        ) : level === 'high' ? (
                          <AlertTriangleIcon size={15} className="text-amber-500 flex-shrink-0" />
                        ) : (
                          <CheckCircleIcon size={15} className="text-emerald-500 flex-shrink-0" />
                        )}
                        <span className="text-sm text-[var(--foreground)]">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-blue-500/20 blur-xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">
            Features
          </span>
          <h2
            className="mt-3 text-4xl md:text-5xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Everything you need to stay safe
          </h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="group p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-up"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <div className={`w-11 h-11 rounded-xl ${f.bg} flex items-center justify-center mb-4`}>
                {f.icon}
              </div>
              <h3 className="font-bold text-[var(--foreground)] mb-2">{f.title}</h3>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="py-24 bg-[var(--muted)]/40">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">
              How it works
            </span>
            <h2
              className="mt-3 text-4xl font-extrabold text-[var(--foreground)]"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              Three steps to confidence
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            <div className="hidden md:block absolute top-9 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent" />
            {steps.map((s) => (
              <div key={s.num} className="flex flex-col items-center text-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
                  <span
                    className="text-white font-extrabold text-xl"
                    style={{ fontFamily: 'var(--font-display)' }}
                  >
                    {s.num}
                  </span>
                </div>
                <div>
                  <h3 className="font-bold text-lg text-[var(--foreground)] mb-2">{s.title}</h3>
                  <p className="text-[var(--muted-foreground)] text-sm leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--primary)] px-8 py-16 text-center shadow-xl">
          <div
            className="absolute inset-0 opacity-10"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)',
              backgroundSize: '40px 40px',
            }}
          />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="relative">
            <h2
              className="text-4xl font-extrabold text-white mb-4"
              style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
            >
              Your next job is real.
              <br />
              Make sure it&apos;s legitimate.
            </h2>
            <p className="text-indigo-200 mb-8 text-lg max-w-xl mx-auto">
              Start scanning for free today. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={goToApp}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                <ZapIcon size={16} />
                {user ? 'Go to dashboard' : 'Get started free'}
              </button>
              <button
                onClick={() => {
                  if (user) {
                    goToAnalyzer();
                    return;
                  }
                  // Guests stay on the public flow — this button just gets
                  // them to the input they can actually use, never /register
                  // or any authenticated route.
                  heroInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  heroInputRef.current?.focus();
                }}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white/10 text-white font-semibold hover:bg-white/20 transition-all border border-white/20"
              >
                Analyze a job now
                <ArrowRightIcon size={15} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">
            FAQ
          </span>
          <h2
            className="mt-3 text-4xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Common questions
          </h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div
              key={faq.q}
              className="border border-[var(--border)] rounded-2xl bg-[var(--card)] overflow-hidden"
            >
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[var(--muted)]/40 transition-colors"
              >
                <span className="font-semibold text-[var(--foreground)] text-sm">{faq.q}</span>
                <ChevronDownIcon
                  size={16}
                  className={`flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${openFaq === i ? 'rotate-180' : ''}`}
                />
              </button>
              {openFaq === i && (
                <div className="px-6 pb-5 text-sm text-[var(--muted-foreground)] leading-relaxed animate-fade-in border-t border-[var(--border)] pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="py-24 max-w-3xl mx-auto px-6">
        <div className="text-center mb-12">
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">
            Contact
          </span>
          <h2
            className="mt-3 text-4xl font-extrabold text-[var(--foreground)]"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Get in touch
          </h2>
          <p className="mt-3 text-[var(--muted-foreground)]">
            Questions, feedback, or something doesn&apos;t look right? Send us a message.
          </p>
        </div>
        <Card padding="lg">
          <ContactForm />
        </Card>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <Link href="/" className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
              <ShieldCheckIcon size={14} className="text-white" />
            </div>
            <span
              className="font-bold text-[var(--foreground)]"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              JobCheck
            </span>
          </Link>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed max-w-sm mb-8">
            Rule-based job-ad scam detection for job seekers.
          </p>
          <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between gap-3 items-center">
            <p className="text-xs text-[var(--muted-foreground)]">© 2026 JobCheck.</p>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <CheckIcon size={12} className="text-emerald-500" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
