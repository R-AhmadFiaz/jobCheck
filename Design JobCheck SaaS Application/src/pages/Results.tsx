import { useState } from "react"
import {
  Card, Badge, Button, Alert, Progress, Tooltip, Modal,
  RiskBadge, Tabs,
  ShieldCheckIcon, AlertTriangleIcon, XCircleIcon, CheckCircleIcon,
  CopyIcon, DownloadIcon, BookmarkIcon, ShareIcon, InfoIcon,
  ExternalLinkIcon, ChevronDownIcon, ZapIcon, ClockIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface ResultsProps { onNavigate: (p: Page) => void }

const indicators = [
  {
    category: "Financial",
    severity: "critical",
    title: "Upfront equipment payment required",
    detail: "The posting asks candidates to purchase a $350 workstation before starting. Legitimate employers never require equipment purchases.",
    evidence: '"You will be required to purchase your initial workstation equipment ($350)"',
  },
  {
    category: "Contact",
    severity: "high",
    title: "Personal email domain (gmail.com)",
    detail: "Legitimate companies always use corporate email domains. A Gmail address for an official hiring contact is a strong fraud signal.",
    evidence: '"hiring.manager2024@gmail.com"',
  },
  {
    category: "Payment",
    severity: "high",
    title: "Non-standard payment methods",
    detail: "CashApp and Zelle are peer-to-peer payment apps, not payroll systems. No legitimate employer pays salary via these platforms.",
    evidence: '"paid weekly via CashApp or Zelle"',
  },
  {
    category: "Communication",
    severity: "high",
    title: "WhatsApp contact requested",
    detail: "Asking for a WhatsApp number in a job application is unusual and indicates the recruiter wants to move off-platform quickly.",
    evidence: '"your CV along with your WhatsApp number"',
  },
  {
    category: "Company",
    severity: "medium",
    title: "Unverifiable company identity",
    detail: "We could not verify the hiring company exists as a registered business. No LinkedIn, Crunchbase, or corporate website found.",
    evidence: "No company website or corporate registration found",
  },
  {
    category: "Content",
    severity: "low",
    title: "Vague responsibilities",
    detail: "The role description is unusually generic for a senior position. Scam postings often use boilerplate text to appeal to a wide pool.",
    evidence: '"Develop and execute marketing strategies"',
  },
]

const timeline = [
  { label: "Job discovered",        time: "June 14, 2026 · 10:42 AM",  icon: <SearchIcon />,        done: true },
  { label: "Content parsed",        time: "Processing complete",         icon: <ZapIcon />,           done: true },
  { label: "AI analysis complete",  time: "3 signals flagged critical",  icon: <ShieldCheckIcon />,   done: true },
  { label: "Risk score calculated", time: "Score: 74 / 100",            icon: <AlertTriangleIcon />, done: true },
  { label: "Report ready",          time: "View and export below",       icon: <CheckCircleIcon />,   done: true },
]

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
}

const severityConfig = {
  critical: { color: "text-red-600",    bg: "bg-red-50 dark:bg-red-950/30",    border: "border-red-200 dark:border-red-900",  badge: "danger" as const },
  high:     { color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/30", border: "border-orange-200 dark:border-orange-900", badge: "danger" as const },
  medium:   { color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-950/30", border: "border-amber-200 dark:border-amber-900",   badge: "warning" as const },
  low:      { color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-950/30",  border: "border-blue-200 dark:border-blue-900",    badge: "info" as const },
}

export default function Results({ onNavigate }: ResultsProps) {
  const [tab, setTab] = useState("overview")
  const [expandedIndicator, setExpandedIndicator] = useState<number | null>(null)
  const [shareModal, setShareModal] = useState(false)
  const [saved, setSaved] = useState(false)
  const score = 74

  const dashOffset = 283 - (283 * score) / 100

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      {/* Header actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-up">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <RiskBadge level="high" />
            <span className="text-xs text-[var(--muted-foreground)]">Analyzed June 14, 2026</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
            Senior Remote Marketing Manager
          </h1>
          <p className="text-sm text-[var(--muted-foreground)] mt-0.5">Unverified company · Remote · $120K–$160K/yr</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Button variant="outline" size="sm" icon={<BookmarkIcon size={14} />} onClick={() => setSaved(!saved)}>
            {saved ? "Saved" : "Save"}
          </Button>
          <Button variant="outline" size="sm" icon={<ShareIcon size={14} />} onClick={() => setShareModal(true)}>
            Share
          </Button>
          <Button variant="outline" size="sm" icon={<DownloadIcon size={14} />}>
            Export PDF
          </Button>
          <Button size="sm" icon={<ZapIcon size={14} />} onClick={() => onNavigate("analyze")}>
            New scan
          </Button>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "overview",      label: "Overview" },
          { id: "indicators",   label: `Indicators (${indicators.length})` },
          { id: "recommendations", label: "Recommendations" },
          { id: "timeline",     label: "Timeline" },
        ]}
        className="animate-fade-up stagger-1"
      />

      {tab === "overview" && (
        <div className="grid lg:grid-cols-3 gap-6 animate-fade-in">
          {/* Score card */}
          <Card className="flex flex-col items-center text-center gap-4 lg:col-span-1">
            <div className="relative w-44 h-44">
              <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                <circle cx="60" cy="60" r="45" fill="none" stroke="var(--muted)" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="45" fill="none"
                  stroke="url(#scoreGrad)" strokeWidth="10"
                  strokeLinecap="round"
                  strokeDasharray="283"
                  strokeDashoffset={dashOffset}
                  style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }}
                />
                <defs>
                  <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#F59E0B" />
                    <stop offset="100%" stopColor="#EF4444" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-5xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                  {score}
                </span>
                <span className="text-sm text-[var(--muted-foreground)] font-medium">risk score</span>
              </div>
            </div>

            <div>
              <RiskBadge level="high" />
              <p className="text-sm text-[var(--muted-foreground)] mt-2 leading-relaxed">
                This posting shows multiple strong indicators of fraud. We strongly recommend <strong>not applying</strong>.
              </p>
            </div>

            {/* Risk meter */}
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

          {/* Summary breakdown */}
          <div className="lg:col-span-2 space-y-4">
            <Alert variant="error" title="Do not apply to this job">
              We detected 3 critical fraud signals including an upfront payment request, non-standard payment methods, and an unverifiable company identity.
            </Alert>

            {/* Signal summary */}
            <Card>
              <h3 className="font-bold text-[var(--foreground)] mb-4">Signal Breakdown</h3>
              <div className="space-y-3">
                {[
                  { label: "Critical signals", count: 1, color: "danger" as const,  bar: "bg-red-500" },
                  { label: "High signals",     count: 3, color: "danger" as const,  bar: "bg-orange-500" },
                  { label: "Medium signals",   count: 1, color: "warning" as const, bar: "bg-amber-500" },
                  { label: "Low signals",      count: 1, color: "info" as const,    bar: "bg-blue-500" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-3">
                    <span className="w-28 text-sm text-[var(--muted-foreground)]">{s.label}</span>
                    <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                      <div className={`h-full rounded-full ${s.bar}`} style={{ width: `${(s.count / 6) * 100}%` }} />
                    </div>
                    <span className="w-4 text-sm font-semibold text-[var(--foreground)] text-right">{s.count}</span>
                  </div>
                ))}
              </div>
            </Card>

            {/* Quick indicators */}
            <Card>
              <h3 className="font-bold text-[var(--foreground)] mb-4">Key Red Flags</h3>
              <div className="space-y-2.5">
                {indicators.slice(0, 4).map((ind, i) => (
                  <div key={i} className="flex items-start gap-3">
                    {ind.severity === "critical" ? (
                      <XCircleIcon size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
                    ) : ind.severity === "high" ? (
                      <AlertTriangleIcon size={16} className="text-orange-500 flex-shrink-0 mt-0.5" />
                    ) : (
                      <InfoIcon size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{ind.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-0.5 italic">Evidence: {ind.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button
                onClick={() => setTab("indicators")}
                className="mt-4 text-sm font-semibold text-[var(--primary)] hover:underline flex items-center gap-1"
              >
                View all {indicators.length} indicators <ExternalLinkIcon size={12} />
              </button>
            </Card>
          </div>
        </div>
      )}

      {tab === "indicators" && (
        <div className="space-y-3 animate-fade-in">
          <p className="text-sm text-[var(--muted-foreground)]">
            {indicators.length} fraud signals detected · Click each to expand evidence
          </p>
          {indicators.map((ind, i) => {
            const sc = severityConfig[ind.severity as keyof typeof severityConfig]
            const open = expandedIndicator === i
            return (
              <div key={i} className={`rounded-2xl border ${sc.border} ${sc.bg} overflow-hidden`}>
                <button
                  onClick={() => setExpandedIndicator(open ? null : i)}
                  className="w-full flex items-center gap-4 px-5 py-4 text-left"
                >
                  <div className={`flex-shrink-0 ${sc.color}`}>
                    {ind.severity === "critical" ? <XCircleIcon size={20} /> :
                     ind.severity === "high" ? <AlertTriangleIcon size={20} /> :
                     ind.severity === "medium" ? <AlertTriangleIcon size={20} /> :
                     <InfoIcon size={20} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-[var(--foreground)]">{ind.title}</span>
                      <Badge variant={sc.badge}>{ind.severity.charAt(0).toUpperCase() + ind.severity.slice(1)}</Badge>
                      <span className="text-xs text-[var(--muted-foreground)]">{ind.category}</span>
                    </div>
                  </div>
                  <ChevronDownIcon
                    size={16}
                    className={`flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
                  />
                </button>
                {open && (
                  <div className="px-5 pb-5 border-t border-current/10 space-y-3 animate-fade-in">
                    <p className="text-sm text-[var(--foreground)] leading-relaxed">{ind.detail}</p>
                    <div className="rounded-xl bg-[var(--card)] border border-[var(--border)] p-3">
                      <p className="text-xs text-[var(--muted-foreground)] font-semibold mb-1">Evidence from posting:</p>
                      <p className="text-sm font-mono text-[var(--foreground)] italic">{ind.evidence}</p>
                    </div>
                    <div className="flex gap-2">
                      <button className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                        <CopyIcon size={11} /> Copy evidence
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {tab === "recommendations" && (
        <div className="space-y-4 animate-fade-in">
          <Alert variant="error" title="Recommendation: Do not apply">
            The combination of upfront payment requests, non-standard payment methods, and an unverifiable company identity are hallmarks of a job scam.
          </Alert>

          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                step: "01", color: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400",
                title: "Do not pay anything",
                detail: "Never transfer money to a potential employer. No legitimate company requires equipment purchases or training fees from candidates.",
              },
              {
                step: "02", color: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400",
                title: "Verify the company independently",
                detail: "Search for the company on LinkedIn, Crunchbase, Google Maps, and the national company registry. If they don't appear, it's likely fake.",
              },
              {
                step: "03", color: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400",
                title: "Contact via official channels only",
                detail: "Reach out to the company through their official website contact page — not via Gmail, WhatsApp, or any address in the posting.",
              },
              {
                step: "04", color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400",
                title: "Report the scam",
                detail: "Report this posting to the job board and to the FTC at reportfraud.ftc.gov. Help protect other job seekers.",
              },
            ].map(r => (
              <Card key={r.step} hover>
                <div className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-bold mb-3 ${r.color}`}>{r.step}</div>
                <h3 className="font-bold text-[var(--foreground)] mb-2">{r.title}</h3>
                <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{r.detail}</p>
              </Card>
            ))}
          </div>

          <Card className="border-[var(--primary)] gradient-border">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--secondary)] flex items-center justify-center flex-shrink-0">
                <ShieldCheckIcon size={18} className="text-[var(--primary)]" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--foreground)] mb-1">Find legitimate opportunities</h3>
                <p className="text-sm text-[var(--muted-foreground)] mb-3">
                  Use our Knowledge Base to find verified companies and trusted recruiters in your field.
                </p>
                <Button size="sm" variant="secondary" onClick={() => onNavigate("knowledge")}>
                  Browse Knowledge Base
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {tab === "timeline" && (
        <Card className="animate-fade-in">
          <h3 className="font-bold text-[var(--foreground)] mb-6">Analysis Timeline</h3>
          <div className="relative pl-8 space-y-8">
            <div className="absolute left-3 top-2 bottom-2 w-px bg-[var(--border)]" />
            {timeline.map((t, i) => (
              <div key={i} className="relative">
                <div className="absolute -left-5 w-4 h-4 rounded-full bg-[var(--primary)] border-2 border-[var(--card)] flex items-center justify-center">
                  <span className="text-white scale-75">{t.icon}</span>
                </div>
                <div>
                  <p className="font-semibold text-[var(--foreground)] text-sm">{t.label}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                    <ClockIcon size={10} />{t.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Share modal */}
      <Modal open={shareModal} onClose={() => setShareModal(false)} title="Share Analysis">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">Share this analysis report with a friend or colleague.</p>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]">
            <span className="text-sm text-[var(--foreground)] font-mono flex-1 truncate">https://jobcheck.ai/r/x7k2m9p</span>
            <Button variant="ghost" size="sm" icon={<CopyIcon size={13} />}>Copy</Button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Link expires in 30 days. No account required to view.</p>
        </div>
      </Modal>
    </div>
  )
}
