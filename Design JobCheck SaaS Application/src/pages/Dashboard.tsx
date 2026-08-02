import { useState } from "react"
import {
  Card, StatCard, Badge, RiskBadge, Progress, Skeleton, Button,
  ShieldCheckIcon, ZapIcon, TrendingUpIcon, AlertTriangleIcon,
  ClockIcon, ArrowRightIcon, BookmarkIcon, BarChartIcon,
  CheckCircleIcon, XCircleIcon, BriefcaseIcon, ActivityIcon,
} from "../components/ui"
import type { Page, RiskLevel } from "../components/ui"

interface DashboardProps { onNavigate: (p: Page) => void }

const recentAnalyses = [
  { id: 1, title: "Senior Product Designer", company: "DesignCo Inc.", risk: "safe" as RiskLevel,    score: 12, date: "2h ago",    saved: true },
  { id: 2, title: "Remote Developer (Full-Stack)", company: "TechVentures Ltd.", risk: "high" as RiskLevel,    score: 74, date: "Yesterday", saved: false },
  { id: 3, title: "Marketing Coordinator",  company: "BrandFirst Agency", risk: "medium" as RiskLevel, score: 45, date: "2 days ago", saved: false },
  { id: 4, title: "Data Analyst II",        company: "Analytics Corp",    risk: "safe" as RiskLevel,    score: 8,  date: "3 days ago", saved: true },
  { id: 5, title: "Crypto Investment Manager","company": "CoinPros (unverified)", risk: "critical" as RiskLevel, score: 94, date: "4 days ago", saved: false },
]

const riskDistribution = [
  { label: "Safe",     pct: 42, color: "bg-emerald-500" },
  { label: "Low",      pct: 18, color: "bg-blue-500" },
  { label: "Medium",   pct: 22, color: "bg-amber-500" },
  { label: "High",     pct: 12, color: "bg-orange-500" },
  { label: "Critical", pct: 6,  color: "bg-red-500" },
]

const activity = [
  { icon: <ZapIcon size={14} />, text: "Analyzed 'UX Researcher at Figma'", time: "2h ago",      color: "text-indigo-500" },
  { icon: <CheckCircleIcon size={14} />, text: "Saved analysis: Senior Designer", time: "Yesterday", color: "text-emerald-500" },
  { icon: <AlertTriangleIcon size={14} />, text: "High-risk job flagged: Remote Dev", time: "Yesterday",  color: "text-amber-500" },
  { icon: <XCircleIcon size={14} />, text: "Critical risk detected — not applied", time: "3 days ago", color: "text-red-500" },
  { icon: <BookmarkIcon size={14} />, text: "Bookmarked: Data Analyst II",        time: "3 days ago", color: "text-blue-500" },
]

export default function Dashboard({ onNavigate }: DashboardProps) {
  const [loading] = useState(false)

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
          Good morning, Alex 👋
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Here's your job safety overview — <span className="font-medium text-[var(--foreground)]">5 analyses</span> this week.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total analyses"
          value="47"
          delta="+5 this week"
          icon={<BarChartIcon size={20} />}
          color="primary"
        />
        <StatCard
          label="Scams caught"
          value="9"
          delta="19% of all scans"
          icon={<ShieldCheckIcon size={20} />}
          color="danger"
        />
        <StatCard
          label="Safe listings"
          value="32"
          delta="68% success rate"
          icon={<CheckCircleIcon size={20} />}
          color="safe"
        />
        <StatCard
          label="Saved analyses"
          value="14"
          delta="3 new this month"
          icon={<BookmarkIcon size={20} />}
          color="warning"
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent analyses table */}
        <div className="lg:col-span-2 animate-fade-up stagger-2">
          <Card padding="none">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
              <div>
                <h2 className="font-bold text-[var(--foreground)]">Recent Analyses</h2>
                <p className="text-xs text-[var(--muted-foreground)] mt-0.5">Your last 5 job scans</p>
              </div>
              <Button variant="ghost" size="sm" iconRight={<ArrowRightIcon size={13} />} onClick={() => onNavigate("results")}>
                View all
              </Button>
            </div>

            {loading ? (
              <div className="p-6 space-y-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-14 rounded-xl" />)}
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {recentAnalyses.map(a => (
                  <div
                    key={a.id}
                    onClick={() => onNavigate("results")}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[var(--muted)]/40 cursor-pointer transition-colors group"
                  >
                    {/* Risk icon */}
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0
                      ${a.risk === "safe" ? "bg-emerald-50 dark:bg-emerald-950/40" :
                        a.risk === "medium" ? "bg-amber-50 dark:bg-amber-950/40" :
                        a.risk === "critical" ? "bg-red-50 dark:bg-red-950/40" :
                        "bg-orange-50 dark:bg-orange-950/40"}`}>
                      {a.risk === "safe" ? (
                        <ShieldCheckIcon size={18} className="text-emerald-600" />
                      ) : a.risk === "critical" ? (
                        <XCircleIcon size={18} className="text-red-600" />
                      ) : (
                        <AlertTriangleIcon size={18} className={a.risk === "medium" ? "text-amber-600" : "text-orange-600"} />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                        {a.title}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1.5 mt-0.5">
                        <BriefcaseIcon size={10} />
                        {a.company}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 flex-shrink-0">
                      <RiskBadge level={a.risk} />
                      <div className="hidden sm:flex flex-col items-end gap-0.5">
                        <span className="text-sm font-bold text-[var(--foreground)]">{a.score}</span>
                        <span className="text-xs text-[var(--muted-foreground)]">score</span>
                      </div>
                      <span className="text-xs text-[var(--muted-foreground)] hidden md:block">{a.date}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-6 py-4 border-t border-[var(--border)]">
              <Button variant="secondary" size="sm" className="w-full" onClick={() => onNavigate("analyze")} icon={<ZapIcon size={14} />}>
                Analyze a new job posting
              </Button>
            </div>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Risk distribution */}
          <Card className="animate-fade-up stagger-3">
            <h3 className="font-bold text-[var(--foreground)] mb-4">Risk Distribution</h3>
            <div className="space-y-3">
              {riskDistribution.map(r => (
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
          </Card>

          {/* Quick actions */}
          <Card className="animate-fade-up stagger-4">
            <h3 className="font-bold text-[var(--foreground)] mb-4">Quick Actions</h3>
            <div className="space-y-2">
              {[
                { label: "Analyze a job",     icon: <ZapIcon size={15} />,          page: "analyze" as Page,   color: "bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40" },
                { label: "Browse knowledge base", icon: <BriefcaseIcon size={15} />,page: "knowledge" as Page, color: "bg-blue-50 text-blue-600 dark:bg-blue-950/40" },
                { label: "View saved analyses",  icon: <BookmarkIcon size={15} />,   page: "results" as Page,   color: "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40" },
                { label: "Profile & security",   icon: <ShieldCheckIcon size={15} />,page: "profile" as Page,   color: "bg-amber-50 text-amber-600 dark:bg-amber-950/40" },
              ].map(q => (
                <button
                  key={q.label}
                  onClick={() => onNavigate(q.page)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-[var(--muted)] transition-colors group text-left"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${q.color}`}>
                    {q.icon}
                  </div>
                  <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                    {q.label}
                  </span>
                  <ArrowRightIcon size={13} className="ml-auto text-[var(--muted-foreground)] opacity-0 group-hover:opacity-100 transition-all translate-x-0 group-hover:translate-x-0.5" />
                </button>
              ))}
            </div>
          </Card>

          {/* Activity feed */}
          <Card className="animate-fade-up stagger-5">
            <h3 className="font-bold text-[var(--foreground)] mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activity.map((a, i) => (
                <div key={i} className="flex items-start gap-3">
                  <div className={`mt-0.5 ${a.color} flex-shrink-0`}>{a.icon}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-[var(--foreground)] leading-snug">{a.text}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5 flex items-center gap-1">
                      <ClockIcon size={9} />{a.time}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* Upgrade banner */}
      <div className="animate-fade-up stagger-6">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)",
            backgroundSize: "24px 24px"
          }} />
          <div className="relative">
            <Badge variant="purple" className="mb-2 bg-white/20 text-white">Free plan · 3 analyses left</Badge>
            <h3 className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>Upgrade to Pro</h3>
            <p className="text-indigo-200 text-sm mt-0.5">Unlimited scans + URL scanning + recruiter lookup</p>
          </div>
          <button className="relative flex-shrink-0 px-5 py-2.5 rounded-xl bg-white text-indigo-700 font-bold text-sm hover:bg-indigo-50 transition-all shadow-sm">
            Upgrade — $9/mo
          </button>
        </div>
      </div>
    </div>
  )
}
