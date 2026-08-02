import { useState } from "react"
import {
  Card, Badge, Button, Input, Tabs, EmptyState, Pagination, Progress,
  SearchIcon, FilterIcon, BuildingIcon, UserIcon, GlobeIcon,
  CheckCircleIcon, AlertTriangleIcon, XCircleIcon, StarIcon,
  ExternalLinkIcon, BookOpenIcon, ShieldCheckIcon, ZapIcon, ClockIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface KnowledgeProps { onNavigate: (p: Page) => void }

const companies = [
  { name: "Stripe", domain: "stripe.com", industry: "Fintech", trust: 98, verified: true,  reports: 0,  jobs: 42 },
  { name: "Figma",  domain: "figma.com",  industry: "Design",  trust: 97, verified: true,  reports: 0,  jobs: 18 },
  { name: "Vercel", domain: "vercel.com", industry: "DevOps",  trust: 96, verified: true,  reports: 0,  jobs: 31 },
  { name: "Linear", domain: "linear.app", industry: "Saas",    trust: 94, verified: true,  reports: 0,  jobs: 9  },
  { name: "Notion", domain: "notion.so",  industry: "SaaS",    trust: 93, verified: true,  reports: 1,  jobs: 24 },
  { name: "Remote Corp Ltd.", domain: "remotecorp.biz", industry: "Unknown", trust: 14, verified: false, reports: 47, jobs: 289 },
  { name: "CoinPros Inc.",    domain: "coinpros.io",    industry: "Crypto",  trust: 8,  verified: false, reports: 112, jobs: 540 },
  { name: "GlobalHire Now",   domain: "globalhirenow.net", industry: "Staffing", trust: 21, verified: false, reports: 38, jobs: 182 },
]

const recruiters = [
  { name: "Sarah Mitchell", title: "Senior Tech Recruiter", company: "Stripe", score: 96, verified: true,  reports: 0  },
  { name: "James Park",     title: "Talent Partner",        company: "Figma",  score: 94, verified: true,  reports: 0  },
  { name: "Aisha Okafor",   title: "Engineering Recruiter", company: "Vercel", score: 92, verified: true,  reports: 0  },
  { name: "Mike Chen",      title: "Remote Hiring Manager", company: "Remote Corp Ltd.", score: 18, verified: false, reports: 34 },
  { name: "hiring.manager2024", title: "Unknown", company: "Unknown", score: 2, verified: false, reports: 89 },
]

const communityReports = [
  { title: "CoinPros 'Investment Manager' scam — requires $500 upfront", company: "CoinPros Inc.", votes: 142, date: "2 days ago", severity: "critical" },
  { title: "GlobalHire Now — fake remote positions, advance-fee fraud",   company: "GlobalHire Now",   votes: 87,  date: "1 week ago", severity: "high" },
  { title: "Remote Corp Ltd sending fake offer letters",                  company: "Remote Corp Ltd.", votes: 63,  date: "2 weeks ago", severity: "high" },
  { title: "Phishing emails impersonating Stripe HR",                    company: "Stripe (fake)",    votes: 38,  date: "3 weeks ago", severity: "medium" },
]

function TrustScore({ score }: { score: number }) {
  const color = score >= 80 ? "text-emerald-600" : score >= 50 ? "text-amber-600" : "text-red-600"
  const bg    = score >= 80 ? "bg-emerald-500"   : score >= 50 ? "bg-amber-500"   : "bg-red-500"
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
        <div className={`h-full rounded-full ${bg} transition-all duration-500`} style={{ width: `${score}%` }} />
      </div>
      <span className={`text-sm font-bold font-mono ${color}`}>{score}</span>
    </div>
  )
}

export default function KnowledgeBase({ onNavigate }: KnowledgeProps) {
  const [tab, setTab] = useState("companies")
  const [query, setQuery] = useState("")
  const [page, setPage] = useState(1)
  const [industry, setIndustry] = useState("All")

  const filteredCompanies = companies.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) &&
    (industry === "All" || c.industry === industry)
  )

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
          Knowledge Base
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Verified company profiles, recruiter trust scores, and community-reported scams.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-up stagger-1">
        {[
          { val: "2.1M+", label: "Companies indexed" },
          { val: "8.4M+", label: "Recruiters profiled" },
          { val: "50K+",  label: "Scams reported" },
          { val: "99.1%", label: "Verified accuracy" },
        ].map(s => (
          <Card key={s.label} padding="sm" className="text-center">
            <p className="text-xl font-extrabold text-[var(--primary)]" style={{ fontFamily: "var(--font-display)" }}>{s.val}</p>
            <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3 animate-fade-up stagger-2">
        <div className="flex-1">
          <Input
            placeholder="Search companies, recruiters, domains…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            icon={<SearchIcon size={16} />}
          />
        </div>
        <select
          value={industry}
          onChange={e => setIndustry(e.target.value)}
          className="px-3 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
        >
          {["All", "Fintech", "Design", "DevOps", "SaaS", "Crypto", "Staffing", "Unknown"].map(i => (
            <option key={i}>{i}</option>
          ))}
        </select>
        <Button variant="outline" icon={<FilterIcon size={14} />}>Filters</Button>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "companies",  label: "Companies",       icon: <BuildingIcon size={14} /> },
          { id: "recruiters", label: "Recruiters",      icon: <UserIcon size={14} /> },
          { id: "reports",    label: "Community Reports", icon: <ShieldCheckIcon size={14} /> },
        ]}
        className="animate-fade-up stagger-3"
      />

      {tab === "companies" && (
        <div className="animate-fade-in">
          {filteredCompanies.length === 0 ? (
            <EmptyState
              icon={<SearchIcon />}
              title="No companies found"
              description="Try a different search term or remove filters."
            />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {filteredCompanies.map(c => (
                <Card key={c.name} hover className="animate-fade-up">
                  <div className="flex items-start gap-3 mb-4">
                    {/* Logo placeholder */}
                    <div className="w-12 h-12 rounded-xl bg-[var(--muted)] flex items-center justify-center flex-shrink-0 font-bold text-lg text-[var(--muted-foreground)]" style={{ fontFamily: "var(--font-display)" }}>
                      {c.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <h3 className="font-bold text-[var(--foreground)]">{c.name}</h3>
                        {c.verified ? (
                          <Badge variant="safe">
                            <CheckCircleIcon size={10} /> Verified
                          </Badge>
                        ) : (
                          <Badge variant="danger">Unverified</Badge>
                        )}
                      </div>
                      <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1">
                        <GlobeIcon size={10} />{c.domain} · {c.industry}
                      </p>
                    </div>
                    {c.reports > 0 && (
                      <Badge variant="danger">{c.reports} reports</Badge>
                    )}
                  </div>

                  <div className="space-y-2 mb-4">
                    <div className="flex items-center justify-between text-xs text-[var(--muted-foreground)] mb-1">
                      <span>Trust score</span>
                    </div>
                    <TrustScore score={c.trust} />
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[var(--muted-foreground)]">{c.jobs} active job listings</span>
                    <button className="text-xs font-semibold text-[var(--primary)] hover:underline flex items-center gap-1">
                      View profile <ExternalLinkIcon size={10} />
                    </button>
                  </div>
                </Card>
              ))}
            </div>
          )}
          <div className="flex justify-between items-center mt-6">
            <p className="text-xs text-[var(--muted-foreground)]">
              Showing {filteredCompanies.length} of {companies.length} companies
            </p>
            <Pagination page={page} total={80} perPage={8} onChange={setPage} />
          </div>
        </div>
      )}

      {tab === "recruiters" && (
        <div className="space-y-3 animate-fade-in">
          {recruiters.map(r => (
            <Card key={r.name} hover className="animate-fade-up">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-400 to-blue-500 flex items-center justify-center text-white font-bold flex-shrink-0">
                  {r.name[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-[var(--foreground)]">{r.name}</span>
                    {r.verified ? (
                      <Badge variant="safe"><CheckCircleIcon size={10} /> Verified</Badge>
                    ) : (
                      <Badge variant="danger">Unverified</Badge>
                    )}
                    {r.reports > 0 && <Badge variant="danger">{r.reports} fraud reports</Badge>}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">{r.title} · {r.company}</p>
                  <div className="mt-2 max-w-48">
                    <TrustScore score={r.score} />
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <div className="flex">
                    {Array.from({ length: Math.min(5, Math.floor(r.score / 20)) }).map((_, i) => (
                      <StarIcon key={i} size={12} className="text-amber-400" />
                    ))}
                  </div>
                  <button className="text-xs font-semibold text-[var(--primary)] hover:underline">
                    View
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {tab === "reports" && (
        <div className="space-y-3 animate-fade-in">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-[var(--muted-foreground)]">{communityReports.length} community reports</p>
            <Button size="sm" icon={<ZapIcon size={13} />} variant="secondary">Submit report</Button>
          </div>
          {communityReports.map((r, i) => (
            <Card key={i} hover className="animate-fade-up">
              <div className="flex items-start gap-3">
                <div className={`mt-0.5 flex-shrink-0 ${
                  r.severity === "critical" ? "text-red-500" :
                  r.severity === "high" ? "text-orange-500" : "text-amber-500"
                }`}>
                  {r.severity === "critical" ? <XCircleIcon size={18} /> : <AlertTriangleIcon size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--foreground)] text-sm leading-snug">{r.title}</p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1 flex items-center gap-2">
                        <BuildingIcon size={10} />{r.company}
                        <ClockIcon size={10} />{r.date}
                      </p>
                    </div>
                    <div className="flex flex-col items-center gap-0.5 flex-shrink-0">
                      <button className="text-xs font-bold text-[var(--primary)] flex items-center gap-1">
                        ▲ {r.votes}
                      </button>
                      <span className="text-xs text-[var(--muted-foreground)]">votes</span>
                    </div>
                  </div>
                  <Badge
                    variant={r.severity === "critical" ? "danger" : r.severity === "high" ? "danger" : "warning"}
                    className="mt-2"
                  >
                    {r.severity.charAt(0).toUpperCase() + r.severity.slice(1)} severity
                  </Badge>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
