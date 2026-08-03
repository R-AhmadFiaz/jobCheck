import { useState } from "react"
import { Modal, Button } from "../components/ui"
import {
  ZapIcon, ShareIcon, BookmarkIcon, DownloadIcon,
  CheckCircleIcon, AlertTriangleIcon, XCircleIcon,
  ChevronDownIcon, ShieldCheckIcon, ArrowRightIcon,
  CopyIcon, ExternalLinkIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface ResultsProps { onNavigate: (p: Page) => void }

// ─── Data ─────────────────────────────────────────────────────────────────────

const score = 72

const riskConfig = {
  label: "Be Careful",
  emoji: "⚠️",
  color: {
    text:   "text-amber-600 dark:text-amber-400",
    bg:     "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    pill:   "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300",
    bar:    "from-amber-400 to-orange-500",
    ring:   "stroke-amber-400",
  },
  headline: "This job contains several warning signs that may indicate a potential scam.",
  confidence: "High",
}

const flags = [
  {
    type: "danger",
    icon: "payment",
    title: "Requests upfront payment",
    detail: "The posting mentions fees or purchases required before starting work.",
  },
  {
    type: "warning",
    icon: "salary",
    title: "Unrealistic salary promise",
    detail: "The advertised earnings seem unusually high for the stated experience level.",
  },
  {
    type: "warning",
    icon: "company",
    title: "Company details unverified",
    detail: "We couldn't find a confirmed website or public profile for this employer.",
  },
  {
    type: "warning",
    icon: "contact",
    title: "Non-professional contact method",
    detail: "The recruiter uses a personal email address rather than a company domain.",
  },
  {
    type: "info",
    icon: "desc",
    title: "Vague job description",
    detail: "Responsibilities are listed in broad terms that don't match the seniority level.",
  },
]

const checklist = [
  "Verify the company on their official website",
  "Never pay any recruitment or registration fees",
  "Check the recruiter's email domain matches the company",
  "Avoid sharing passport, ID or banking details",
  'Search the company name + "scam" before applying',
]

// ─── Small helpers ────────────────────────────────────────────────────────────

function FlagIcon({ type }: { type: string }) {
  if (type === "danger")  return <XCircleIcon  size={18} className="text-red-500" />
  if (type === "warning") return <AlertTriangleIcon size={18} className="text-amber-500" />
  return <ShieldCheckIcon size={18} className="text-blue-400" />
}

function FlagCard({ flag, index }: { flag: typeof flags[0]; index: number }) {
  const bg: Record<string, string> = {
    danger:  "bg-red-50    dark:bg-red-950/30   border-red-100   dark:border-red-900/40",
    warning: "bg-amber-50  dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/40",
    info:    "bg-blue-50   dark:bg-blue-950/30  border-blue-100  dark:border-blue-900/40",
  }
  return (
    <div
      className={`flex items-start gap-3 p-4 rounded-2xl border ${bg[flag.type]} animate-fade-up`}
      style={{ animationDelay: `${index * 0.06}s` }}
    >
      <div className="mt-0.5 flex-shrink-0">
        <FlagIcon type={flag.type} />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)] leading-snug mb-0.5">{flag.title}</p>
        <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{flag.detail}</p>
      </div>
    </div>
  )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function Results({ onNavigate }: ResultsProps) {
  const [shareModal, setShareModal]   = useState(false)
  const [jobExpanded, setJobExpanded] = useState(false)
  const [saved, setSaved]             = useState(false)

  const circumference = 2 * Math.PI * 42
  const dashOffset    = circumference - (circumference * score) / 100

  return (
    <div className="min-h-full bg-[var(--background)]">
      <div className="max-w-2xl mx-auto px-4 py-10 space-y-6">

        {/* ── 1 · Header ───────────────────────────────────────────────── */}
        <header className="text-center animate-fade-up">
          <div className="inline-flex items-center justify-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center shadow-sm">
              <ShieldCheckIcon size={16} className="text-white" />
            </div>
            <span className="font-bold text-[var(--foreground)] text-lg" style={{ fontFamily: "var(--font-display)" }}>
              JobCheck
            </span>
          </div>
          <h1
            className="text-2xl font-extrabold text-[var(--foreground)] mb-1"
            style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
          >
            AI Job Safety Check
          </h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            AI analyzed this job posting for possible scam risks
          </p>
        </header>

        {/* ── 2 · Main Result Card ──────────────────────────────────────── */}
        <div
          className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-sm px-8 py-8 flex flex-col items-center text-center gap-5 animate-fade-up stagger-1"
        >
          {/* Ring + score */}
          <div className="relative w-32 h-32">
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {/* Track */}
              <circle cx="50" cy="50" r="42" fill="none" stroke="var(--muted)" strokeWidth="8" />
              {/* Progress */}
              <circle
                cx="50" cy="50" r="42" fill="none"
                className={riskConfig.color.ring}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={dashOffset}
                style={{ transition: "stroke-dashoffset 1.2s cubic-bezier(.4,0,.2,1)", stroke: "#F59E0B" }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span
                className="text-3xl font-extrabold text-[var(--foreground)] leading-none"
                style={{ fontFamily: "var(--font-display)" }}
              >
                {score}
              </span>
              <span className="text-xs text-[var(--muted-foreground)] font-medium">/&nbsp;100</span>
            </div>
          </div>

          {/* Risk pill */}
          <span className={`inline-flex items-center gap-2 px-5 py-2 rounded-full text-sm font-bold ${riskConfig.color.pill}`}>
            {riskConfig.emoji}&ensp;{riskConfig.label}
          </span>

          {/* Headline */}
          <p className="text-base text-[var(--foreground)] leading-relaxed max-w-sm font-medium">
            {riskConfig.headline}
          </p>

          {/* Simple bar */}
          <div className="w-full max-w-xs space-y-2">
            <div className="h-2 rounded-full bg-[var(--muted)] overflow-hidden">
              <div
                className={`h-full rounded-full bg-gradient-to-r ${riskConfig.color.bar} transition-all duration-1000`}
                style={{ width: `${score}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-[var(--muted-foreground)] font-medium">
              <span className="text-emerald-500">Safe</span>
              <span className="text-red-500">High Risk</span>
            </div>
          </div>

          {/* Confidence */}
          <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
            <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
            AI Confidence:
            <span className="font-semibold text-[var(--foreground)]">{riskConfig.confidence}</span>
          </div>
        </div>

        {/* ── 3 · Why AI gave this score ───────────────────────────────── */}
        <section className="animate-fade-up stagger-2">
          <h2
            className="text-base font-bold text-[var(--foreground)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Why AI gave this score
          </h2>
          <div className="space-y-2.5">
            {flags.map((flag, i) => (
              <FlagCard key={flag.title} flag={flag} index={i} />
            ))}
          </div>
        </section>

        {/* ── 4 · AI Summary ───────────────────────────────────────────── */}
        <section className="animate-fade-up stagger-3">
          <div className="rounded-3xl border border-[var(--primary)]/20 bg-gradient-to-br from-[var(--secondary)] to-[var(--card)] p-6 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-6 h-6 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                <ZapIcon size={13} className="text-white" />
              </div>
              <span
                className="text-sm font-bold text-[var(--primary)]"
                style={{ fontFamily: "var(--font-display)" }}
              >
                AI Summary
              </span>
            </div>
            <p className="text-sm text-[var(--foreground)] leading-relaxed">
              This job appears risky because it promises unusually high earnings and asks candidates for payment before hiring. The employer's identity could not be confirmed through public records or a verifiable website. Legitimate employers do not charge applicants fees, and reputable companies always have a professional contact email.
            </p>
            <p className="mt-3 text-xs text-[var(--muted-foreground)] flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)]" />
              Generated by JobCheck AI · Analysis ID REF-20260614-X7K2
            </p>
          </div>
        </section>

        {/* ── 5 · Safety checklist ─────────────────────────────────────── */}
        <section className="animate-fade-up stagger-4">
          <h2
            className="text-base font-bold text-[var(--foreground)] mb-3"
            style={{ fontFamily: "var(--font-display)" }}
          >
            Before you apply
          </h2>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm divide-y divide-[var(--border)]">
            {checklist.map((item, i) => (
              <div key={i} className="flex items-center gap-3 px-5 py-3.5">
                <CheckCircleIcon size={17} className="text-emerald-500 flex-shrink-0" />
                <span className="text-sm text-[var(--foreground)]">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── 6 · Job details (collapsed) ──────────────────────────────── */}
        <section className="animate-fade-up stagger-5">
          <button
            onClick={() => setJobExpanded(!jobExpanded)}
            className="w-full flex items-center justify-between px-5 py-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm hover:border-[var(--border-strong)] transition-colors text-left"
          >
            <span className="text-sm font-semibold text-[var(--foreground)]">Job details</span>
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              {jobExpanded ? "Hide" : "Show"}
              <ChevronDownIcon
                size={14}
                className={`transition-transform duration-200 ${jobExpanded ? "rotate-180" : ""}`}
              />
            </div>
          </button>

          {jobExpanded && (
            <div className="mt-1.5 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm px-5 py-4 space-y-3 animate-fade-in">
              {[
                { label: "Job title",    value: "Senior Remote Marketing Manager" },
                { label: "Company",      value: "Unknown (unverified)"             },
                { label: "Source",       value: "Pasted job description"           },
                { label: "Analyzed",     value: "June 14, 2026 · 2:22 PM"         },
              ].map(row => (
                <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
                  <span className="text-[var(--muted-foreground)] font-medium flex-shrink-0">{row.label}</span>
                  <span className="text-[var(--foreground)] text-right">{row.value}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* ── 7 · Actions ──────────────────────────────────────────────── */}
        <section className="animate-fade-up stagger-6 pt-2 space-y-3">
          {/* Primary */}
          <button
            onClick={() => onNavigate("analyze")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[var(--primary)] text-white font-bold text-sm hover:brightness-110 transition-all shadow-sm"
          >
            <ZapIcon size={15} />
            Analyze Another Job
          </button>

          {/* Secondary row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShareModal(true)}
              className="flex items-center justify-center gap-2 py-3 rounded-2xl border border-[var(--border-strong)] bg-[var(--card)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors"
            >
              <ShareIcon size={14} />
              Share Result
            </button>
            <button
              onClick={() => setSaved(!saved)}
              className={`flex items-center justify-center gap-2 py-3 rounded-2xl border text-sm font-semibold transition-colors
                ${saved
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900"
                  : "border-[var(--border-strong)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted)]"
                }`}
            >
              <BookmarkIcon size={14} />
              {saved ? "Saved!" : "Save Report"}
            </button>
          </div>
        </section>

        {/* Footer note */}
        <p className="text-center text-xs text-[var(--muted-foreground)] pb-4 animate-fade-up stagger-6">
          JobCheck AI analyzes job postings for common scam patterns.<br />
          Always verify opportunities independently before applying.
        </p>
      </div>

      {/* Share modal */}
      <Modal open={shareModal} onClose={() => setShareModal(false)} title="Share this result">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">Share this analysis with a friend or career advisor.</p>
          <div className="flex items-center gap-2 p-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]">
            <span className="text-sm text-[var(--foreground)] font-mono flex-1 truncate">
              jobcheck.ai/r/ref-20260614-x7k2
            </span>
            <Button variant="ghost" size="sm" icon={<CopyIcon size={12} />}>Copy</Button>
          </div>
          <p className="text-xs text-[var(--muted-foreground)]">Link expires in 30 days · No account required to view</p>
        </div>
      </Modal>
    </div>
  )
}
