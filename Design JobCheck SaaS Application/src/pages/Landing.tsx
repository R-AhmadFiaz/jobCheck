import { useState } from "react"
import {
  ShieldCheckIcon, ZapIcon, SearchIcon, CheckCircleIcon, ArrowRightIcon,
  StarIcon, ChevronDownIcon, ShieldAlertIcon, GlobeIcon, UsersIcon,
  TrendingUpIcon, SunIcon, MoonIcon, CheckIcon, AlertTriangleIcon, XCircleIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface LandingProps {
  onNavigate: (p: Page) => void
  dark: boolean
  onToggleDark: () => void
}

const features = [
  {
    icon: <ZapIcon size={22} className="text-indigo-500" />,
    title: "Instant AI Analysis",
    desc: "Paste any job description and get a comprehensive scam-risk report in under 3 seconds.",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
  },
  {
    icon: <ShieldAlertIcon size={22} className="text-amber-500" />,
    title: "Pattern Recognition",
    desc: "Our model is trained on 50,000+ verified fraudulent postings to detect subtle red flags.",
    bg: "bg-amber-50 dark:bg-amber-950/40",
  },
  {
    icon: <GlobeIcon size={22} className="text-blue-500" />,
    title: "URL Scanning",
    desc: "Submit a job URL and we automatically extract, parse, and analyze the full listing.",
    bg: "bg-blue-50 dark:bg-blue-950/40",
  },
  {
    icon: <UsersIcon size={22} className="text-emerald-500" />,
    title: "Community Reports",
    desc: "Crowd-sourced recruiter and company trust scores backed by thousands of verified reports.",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
  },
  {
    icon: <TrendingUpIcon size={22} className="text-violet-500" />,
    title: "Trend Intelligence",
    desc: "Stay ahead with real-time alerts on emerging scam campaigns targeting your field.",
    bg: "bg-violet-50 dark:bg-violet-950/40",
  },
  {
    icon: <SearchIcon size={22} className="text-rose-500" />,
    title: "Recruiter Lookup",
    desc: "Search our database of 2M+ recruiters and companies to verify before you apply.",
    bg: "bg-rose-50 dark:bg-rose-950/40",
  },
]

const steps = [
  { num: "01", title: "Paste or link", desc: "Drop in the full job description or paste the listing URL." },
  { num: "02", title: "AI scans it", desc: "Our model checks 40+ risk signals across content, company, and recruiter data." },
  { num: "03", title: "Get your report", desc: "Receive a clear risk score, flagged indicators, and actionable recommendations." },
]

const testimonials = [
  { name: "Priya Nair", role: "UX Designer", score: 5, text: "JobCheck flagged a 'remote position' that turned out to be a classic payment-advance scam. Saved me hours and probably my bank account." },
  { name: "Marcus Lin", role: "Software Engineer", score: 5, text: "The recruiter lookup feature is incredible. I check every cold outreach now before I respond. It's become part of my workflow." },
  { name: "Sofia Reyes", role: "Freelance Copywriter", score: 5, text: "I've been burned before by fake job ads. JobCheck gives me confidence to apply without the anxiety of 'is this real?'." },
]

const faqs = [
  { q: "How accurate is the risk analysis?", a: "Our model achieves 94.7% accuracy on our validation set of 10,000 labeled postings. We continuously retrain it as new scam patterns emerge." },
  { q: "Is my job description data stored?", a: "Analyses are encrypted and retained only to improve model accuracy. You can delete your history at any time from your profile settings." },
  { q: "Does it work for international job postings?", a: "Yes. JobCheck supports 18 languages and includes localized scam-pattern libraries for North America, Europe, Southeast Asia, and Australia." },
  { q: "What is the URL scan feature?", a: "Paste any job board URL (LinkedIn, Indeed, Glassdoor, and 40+ others) and we'll fetch and analyze the posting automatically." },
  { q: "Can I use JobCheck for free?", a: "The free tier includes 10 analyses per month. Pro ($9/mo) unlocks unlimited analyses, URL scanning, and recruiter lookup." },
]

export default function Landing({ onNavigate, dark, onToggleDark }: LandingProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(null)
  const [input, setInput] = useState("")

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      {/* Nav */}
      <nav className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center">
              <ShieldCheckIcon size={16} className="text-white" />
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>JobCheck</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-[var(--muted-foreground)]">
            <a href="#features" className="hover:text-[var(--foreground)] transition-colors">Features</a>
            <a href="#how-it-works" className="hover:text-[var(--foreground)] transition-colors">How it works</a>
            <a href="#testimonials" className="hover:text-[var(--foreground)] transition-colors">Reviews</a>
            <a href="#faq" className="hover:text-[var(--foreground)] transition-colors">FAQ</a>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={onToggleDark} className="p-2 rounded-lg hover:bg-[var(--muted)] transition-colors text-[var(--muted-foreground)]">
              {dark ? <SunIcon size={17} /> : <MoonIcon size={17} />}
            </button>
            <button onClick={() => onNavigate("login")} className="px-3.5 py-2 rounded-xl text-sm font-semibold hover:bg-[var(--muted)] transition-colors">
              Sign in
            </button>
            <button
              onClick={() => onNavigate("register")}
              className="px-3.5 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:brightness-110 transition-all shadow-sm"
            >
              Get started
            </button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero-mesh relative overflow-hidden">
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(var(--foreground) 1px, transparent 1px), linear-gradient(90deg, var(--foreground) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }} />

        <div className="relative max-w-6xl mx-auto px-6 pt-24 pb-20">
          <div className="flex flex-col items-center text-center">
            {/* Pill */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-sm font-medium text-[var(--muted-foreground)] mb-8 animate-fade-up shadow-sm">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Now with URL scanning — <span className="text-[var(--primary)] font-semibold">try it free</span>
              <ArrowRightIcon size={13} />
            </div>

            <h1
              className="text-5xl md:text-7xl font-extrabold text-[var(--foreground)] max-w-4xl leading-tight animate-fade-up stagger-1"
              style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.03em" }}
            >
              Don't get scammed{" "}
              <span className="gradient-text">applying for jobs.</span>
            </h1>

            <p className="mt-6 text-xl text-[var(--muted-foreground)] max-w-2xl leading-relaxed animate-fade-up stagger-2">
              JobCheck uses AI to analyze job postings for fraud signals — so you can apply with confidence, not anxiety.
            </p>

            {/* Hero CTA input */}
            <div className="mt-10 w-full max-w-2xl animate-fade-up stagger-3">
              <div className="relative flex items-center gap-2 p-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-lg">
                <SearchIcon size={18} className="ml-3 text-[var(--muted-foreground)] flex-shrink-0" />
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Paste a job description or URL…"
                  className="flex-1 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none py-2 pr-2"
                />
                <button
                  onClick={() => { onNavigate("analyze") }}
                  className="flex-shrink-0 flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--primary)] text-white font-semibold text-sm hover:brightness-110 transition-all shadow-sm"
                >
                  <ZapIcon size={14} />
                  Analyze
                </button>
              </div>
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                Free forever · No credit card · 3-second analysis
              </p>
            </div>

            {/* Trust bar */}
            <div className="mt-12 flex flex-wrap justify-center items-center gap-8 animate-fade-up stagger-4">
              {[["94.7%", "Accuracy"], ["50K+", "Scams detected"], ["120K+", "Users protected"], ["2M+", "Jobs analyzed"]].map(([val, label]) => (
                <div key={label} className="text-center">
                  <p className="text-2xl font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>{val}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{label}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Hero illustration: risk meter card */}
          <div className="mt-16 flex justify-center animate-fade-up stagger-5">
            <div className="relative w-full max-w-3xl">
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-3xl shadow-2xl overflow-hidden">
                {/* Mock result card */}
                <div className="flex items-center gap-3 px-6 py-4 border-b border-[var(--border)] bg-[var(--muted)]/30">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-amber-400" />
                  <div className="w-3 h-3 rounded-full bg-emerald-400" />
                  <span className="ml-2 text-xs text-[var(--muted-foreground)] font-mono">jobcheck.ai/analyze</span>
                </div>
                <div className="p-8 grid md:grid-cols-2 gap-8 items-center">
                  {/* Score visual */}
                  <div className="flex flex-col items-center gap-4">
                    <div className="relative w-40 h-40">
                      <svg viewBox="0 0 120 120" className="w-full h-full -rotate-90">
                        <circle cx="60" cy="60" r="48" fill="none" stroke="var(--muted)" strokeWidth="10" />
                        <circle
                          cx="60" cy="60" r="48" fill="none"
                          stroke="url(#riskGrad)" strokeWidth="10"
                          strokeLinecap="round"
                          strokeDasharray="301.6"
                          strokeDashoffset="90"
                          className="transition-all duration-1000"
                        />
                        <defs>
                          <linearGradient id="riskGrad" x1="0" y1="0" x2="1" y2="0">
                            <stop offset="0%" stopColor="#F59E0B" />
                            <stop offset="100%" stopColor="#EF4444" />
                          </linearGradient>
                        </defs>
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-4xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>72</span>
                        <span className="text-xs text-[var(--muted-foreground)] font-medium">risk score</span>
                      </div>
                    </div>
                    <span className="px-4 py-1.5 rounded-full text-sm font-semibold bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400">
                      ● High Risk
                    </span>
                  </div>

                  {/* Indicators */}
                  <div className="space-y-3">
                    <p className="text-sm font-semibold text-[var(--foreground)] mb-4">Detected risk signals</p>
                    {[
                      { label: "Vague job description", level: "high" },
                      { label: "No company verification", level: "high" },
                      { label: "Unusually high salary range", level: "medium" },
                      { label: "Generic email domain (gmail.com)", level: "high" },
                      { label: "Requests personal info upfront", level: "critical" },
                    ].map(({ label, level }) => (
                      <div key={label} className="flex items-center gap-3">
                        {level === "critical" ? (
                          <XCircleIcon size={15} className="text-red-500 flex-shrink-0" />
                        ) : level === "high" ? (
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
              {/* Glow */}
              <div className="absolute -inset-1 rounded-3xl bg-gradient-to-r from-indigo-500/20 to-blue-500/20 blur-xl -z-10" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">Features</span>
          <h2 className="mt-3 text-4xl md:text-5xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            Everything you need to stay safe
          </h2>
          <p className="mt-4 text-[var(--muted-foreground)] text-lg max-w-2xl mx-auto">
            A complete toolkit for verifying job opportunities — from AI scanning to community intelligence.
          </p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className={`group p-6 rounded-2xl border border-[var(--border)] bg-[var(--card)] hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 animate-fade-up`}
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
            <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">How it works</span>
            <h2 className="mt-3 text-4xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              Three steps to confidence
            </h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-9 left-1/6 right-1/6 h-px bg-gradient-to-r from-transparent via-[var(--border-strong)] to-transparent" />
            {steps.map((s, i) => (
              <div key={s.num} className="flex flex-col items-center text-center gap-4">
                <div className="relative w-16 h-16 rounded-2xl bg-[var(--primary)] flex items-center justify-center shadow-lg">
                  <span className="text-white font-extrabold text-xl" style={{ fontFamily: "var(--font-display)" }}>{s.num}</span>
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

      {/* Testimonials */}
      <section id="testimonials" className="py-24 max-w-6xl mx-auto px-6">
        <div className="text-center mb-14">
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">Testimonials</span>
          <h2 className="mt-3 text-4xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            Trusted by 120K+ job seekers
          </h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          {testimonials.map(t => (
            <div key={t.name} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex mb-3">
                {Array.from({ length: t.score }).map((_, i) => (
                  <StarIcon key={i} size={14} className="text-amber-400" />
                ))}
              </div>
              <p className="text-[var(--foreground)] text-sm leading-relaxed mb-4">"{t.text}"</p>
              <div className="flex items-center gap-3 pt-4 border-t border-[var(--border)]">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white text-sm font-bold">
                  {t.name[0]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">{t.name}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{t.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA banner */}
      <section className="py-20 max-w-6xl mx-auto px-6">
        <div className="relative overflow-hidden rounded-3xl bg-[var(--primary)] px-8 py-16 text-center shadow-xl">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle at 20% 50%, white 1px, transparent 1px), radial-gradient(circle at 80% 20%, white 1px, transparent 1px)",
            backgroundSize: "40px 40px"
          }} />
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-white/5 blur-3xl" />
          <div className="relative">
            <h2 className="text-4xl font-extrabold text-white mb-4" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
              Your next job is real.<br />Make sure it's legitimate.
            </h2>
            <p className="text-indigo-200 mb-8 text-lg max-w-xl mx-auto">
              Start scanning for free today. No credit card. Cancel anytime.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => onNavigate("register")}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-white text-indigo-700 font-bold hover:bg-indigo-50 transition-all shadow-sm"
              >
                <ZapIcon size={16} />
                Get started free
              </button>
              <button
                onClick={() => onNavigate("analyze")}
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
          <span className="text-sm font-semibold text-[var(--primary)] uppercase tracking-widest">FAQ</span>
          <h2 className="mt-3 text-4xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            Common questions
          </h2>
        </div>
        <div className="space-y-2">
          {faqs.map((faq, i) => (
            <div key={i} className="border border-[var(--border)] rounded-2xl bg-[var(--card)] overflow-hidden">
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[var(--muted)]/40 transition-colors"
              >
                <span className="font-semibold text-[var(--foreground)] text-sm">{faq.q}</span>
                <ChevronDownIcon
                  size={16}
                  className={`flex-shrink-0 text-[var(--muted-foreground)] transition-transform duration-200 ${openFaq === i ? "rotate-180" : ""}`}
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

      {/* Footer */}
      <footer className="border-t border-[var(--border)] bg-[var(--card)]">
        <div className="max-w-6xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-10">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[var(--primary)] flex items-center justify-center">
                  <ShieldCheckIcon size={14} className="text-white" />
                </div>
                <span className="font-bold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>JobCheck</span>
              </div>
              <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">
                AI-powered job fraud detection for every job seeker.
              </p>
            </div>
            {[
              { heading: "Product", links: ["Features", "Pricing", "Changelog", "Status"] },
              { heading: "Company", links: ["About", "Blog", "Careers", "Press"] },
              { heading: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
            ].map(col => (
              <div key={col.heading}>
                <h4 className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-4">{col.heading}</h4>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l}>
                      <a href="#" className="text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">{l}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="pt-8 border-t border-[var(--border)] flex flex-col sm:flex-row justify-between gap-3 items-center">
            <p className="text-xs text-[var(--muted-foreground)]">© 2026 JobCheck, Inc. All rights reserved.</p>
            <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
              <CheckIcon size={12} className="text-emerald-500" />
              All systems operational
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
