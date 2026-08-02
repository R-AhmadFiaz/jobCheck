import { useState } from "react"
import {
  Card, Badge, Button, Input, Modal, StatCard, Pagination,
  Tabs, Alert, EmptyState, Dropdown, StatusChip,
  SearchIcon, PlusIcon, EditIcon, TrashIcon, FilterIcon,
  DatabaseIcon, ActivityIcon, ShieldCheckIcon, AlertTriangleIcon,
  CheckCircleIcon, MoreVerticalIcon, ZapIcon, ClockIcon,
  TrendingUpIcon, UsersIcon,
} from "../components/ui"

const rules = [
  { id: 1, name: "Gmail contact email",        category: "Contact",   severity: "high",    active: true,  matches: 3847, created: "Mar 12" },
  { id: 2, name: "Upfront payment request",    category: "Financial", severity: "critical", active: true,  matches: 2103, created: "Feb 28" },
  { id: 3, name: "CashApp/Zelle payment",      category: "Financial", severity: "critical", active: true,  matches: 1892, created: "Jan 15" },
  { id: 4, name: "WhatsApp contact required",  category: "Contact",   severity: "high",    active: true,  matches: 2941, created: "Apr 2"  },
  { id: 5, name: "Salary $5K+ per week",       category: "Financial", severity: "high",    active: true,  matches: 1204, created: "Mar 20" },
  { id: 6, name: "Vague responsibilities",     category: "Content",   severity: "low",     active: true,  matches: 5620, created: "Feb 5"  },
  { id: 7, name: "No company website",         category: "Company",   severity: "medium",  active: false, matches: 892,  created: "May 1"  },
  { id: 8, name: "Generic job description",    category: "Content",   severity: "low",     active: true,  matches: 7341, created: "Jan 30" },
]

const activityFeed = [
  { icon: "✓", text: "Rule 'Gmail contact email' triggered 48 times",    time: "5 min ago",  color: "text-emerald-500" },
  { icon: "⚠", text: "New scam pattern detected in crypto job category", time: "23 min ago", color: "text-amber-500" },
  { icon: "+", text: "Rule 'Upfront payment request' created by admin",   time: "1h ago",     color: "text-blue-500" },
  { icon: "✗", text: "Rule 'Vague salary' disabled — low precision",     time: "2h ago",     color: "text-red-500" },
  { icon: "✓", text: "Model retrained with 1,240 new labeled samples",   time: "4h ago",     color: "text-emerald-500" },
  { icon: "⚠", text: "CoinPros domain flagged — 112 community reports",  time: "6h ago",     color: "text-amber-500" },
]

const severityBadge = (s: string) => {
  const map: Record<string, "danger"|"warning"|"info"|"default"> = {
    critical: "danger", high: "danger", medium: "warning", low: "info"
  }
  return <Badge variant={map[s] ?? "default"}>{s}</Badge>
}

interface RuleFormData { name: string; category: string; severity: string; pattern: string }

export default function Admin() {
  const [tab, setTab] = useState("rules")
  const [page, setPage] = useState(1)
  const [query, setQuery] = useState("")
  const [modal, setModal] = useState<"create" | "edit" | null>(null)
  const [deleteModal, setDeleteModal] = useState<number | null>(null)
  const [localRules, setLocalRules] = useState(rules)
  const [form, setForm] = useState<RuleFormData>({ name: "", category: "Contact", severity: "medium", pattern: "" })

  const filtered = localRules.filter(r =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.category.toLowerCase().includes(query.toLowerCase())
  )

  const handleSave = () => {
    if (modal === "create") {
      setLocalRules(prev => [...prev, {
        id: Date.now(), name: form.name, category: form.category, severity: form.severity,
        active: true, matches: 0, created: "Today"
      }])
    }
    setModal(null)
    setForm({ name: "", category: "Contact", severity: "medium", pattern: "" })
  }

  const handleDelete = (id: number) => {
    setLocalRules(prev => prev.filter(r => r.id !== id))
    setDeleteModal(null)
  }

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      <div className="animate-fade-up">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
          Admin Dashboard
        </h1>
        <p className="text-sm text-[var(--muted-foreground)] mt-1">Manage fraud detection rules, monitor system health, and review activity.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 animate-fade-up stagger-1">
        <StatCard label="Active rules"     value={localRules.filter(r => r.active).length} icon={<DatabaseIcon size={18} />}    color="primary" />
        <StatCard label="Total matches"    value="26.8K" delta="last 30 days"              icon={<ActivityIcon size={18} />}    color="warning" />
        <StatCard label="Scams blocked"    value="9,241" delta="this month"                icon={<ShieldCheckIcon size={18} />} color="danger" />
        <StatCard label="Model accuracy"   value="94.7%"                                   icon={<TrendingUpIcon size={18} />}  color="safe" />
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "rules",    label: "Rule Manager",  icon: <DatabaseIcon size={13} /> },
          { id: "overview", label: "System Overview", icon: <ActivityIcon size={13} /> },
          { id: "activity", label: "Activity Feed",  icon: <ClockIcon size={13} /> },
        ]}
        className="animate-fade-up stagger-2"
      />

      {tab === "rules" && (
        <div className="animate-fade-in">
          <Card padding="none">
            {/* Toolbar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-5 py-4 border-b border-[var(--border)]">
              <div className="flex-1 max-w-sm">
                <Input
                  placeholder="Search rules…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  icon={<SearchIcon size={15} />}
                />
              </div>
              <div className="flex items-center gap-2 ml-auto">
                <Button variant="outline" size="sm" icon={<FilterIcon size={13} />}>Filter</Button>
                <Button size="sm" icon={<PlusIcon size={13} />} onClick={() => setModal("create")}>
                  Create rule
                </Button>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--muted)]/30">
                    <th className="px-5 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Rule</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Category</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Severity</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Matches</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-[var(--muted-foreground)] uppercase tracking-wider">Created</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {filtered.map(rule => (
                    <tr key={rule.id} className="hover:bg-[var(--muted)]/30 transition-colors group">
                      <td className="px-5 py-3.5">
                        <span className="font-semibold text-[var(--foreground)]">{rule.name}</span>
                      </td>
                      <td className="px-4 py-3.5">
                        <Badge variant="default">{rule.category}</Badge>
                      </td>
                      <td className="px-4 py-3.5">{severityBadge(rule.severity)}</td>
                      <td className="px-4 py-3.5">
                        <StatusChip status={rule.active ? "active" : "inactive"} />
                      </td>
                      <td className="px-4 py-3.5 text-right font-mono text-sm text-[var(--foreground)]">
                        {rule.matches.toLocaleString()}
                      </td>
                      <td className="px-4 py-3.5 text-right text-[var(--muted-foreground)] text-xs">
                        {rule.created}
                      </td>
                      <td className="px-4 py-3.5">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setForm({ name: rule.name, category: rule.category, severity: rule.severity, pattern: "" }); setModal("edit") }}
                            className="p-1.5 rounded-lg hover:bg-[var(--muted)] text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                          >
                            <EditIcon size={14} />
                          </button>
                          <button
                            onClick={() => setDeleteModal(rule.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-[var(--muted-foreground)] hover:text-red-600 transition-colors"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between px-5 py-4 border-t border-[var(--border)]">
              <p className="text-xs text-[var(--muted-foreground)]">
                Showing {filtered.length} of {localRules.length} rules
              </p>
              <Pagination page={page} total={localRules.length} perPage={10} onChange={setPage} />
            </div>
          </Card>
        </div>
      )}

      {tab === "overview" && (
        <div className="grid md:grid-cols-2 gap-6 animate-fade-in">
          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">System Health</h3>
            <div className="space-y-4">
              {[
                { label: "API response time",  val: "42ms",  status: "active" as const,   pct: 95 },
                { label: "Model accuracy",     val: "94.7%", status: "active" as const,   pct: 95 },
                { label: "Analysis queue",     val: "8 jobs",status: "pending" as const,  pct: 30 },
                { label: "DB connections",     val: "24/100",status: "active" as const,   pct: 24 },
              ].map(s => (
                <div key={s.label} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <StatusChip status={s.status} />
                      <span className="text-[var(--muted-foreground)]">{s.label}</span>
                    </div>
                    <span className="font-mono font-semibold text-[var(--foreground)]">{s.val}</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${s.pct > 80 ? "bg-emerald-500" : s.pct > 50 ? "bg-amber-500" : "bg-blue-500"}`}
                      style={{ width: `${s.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">Rule Performance</h3>
            <div className="space-y-3">
              {localRules.filter(r => r.active).slice(0, 5).map(r => (
                <div key={r.id} className="flex items-center gap-3">
                  <span className="text-xs text-[var(--muted-foreground)] w-36 truncate">{r.name}</span>
                  <div className="flex-1 h-2 rounded-full bg-[var(--muted)] overflow-hidden">
                    <div
                      className={`h-full rounded-full ${r.severity === "critical" ? "bg-red-500" : r.severity === "high" ? "bg-orange-500" : "bg-amber-500"}`}
                      style={{ width: `${Math.min(100, (r.matches / 8000) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono font-semibold text-[var(--foreground)] w-12 text-right">
                    {(r.matches / 1000).toFixed(1)}K
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <Card className="md:col-span-2">
            <Alert variant="info" title="Model retraining scheduled">
              The next model retraining cycle is scheduled for June 17, 2026 at 03:00 UTC. The system will continue operating normally during retraining.
            </Alert>
          </Card>
        </div>
      )}

      {tab === "activity" && (
        <Card className="animate-fade-in">
          <h3 className="font-bold text-[var(--foreground)] mb-4">System Activity</h3>
          <div className="space-y-0 divide-y divide-[var(--border)]">
            {activityFeed.map((a, i) => (
              <div key={i} className="flex items-start gap-3 py-3">
                <span className={`text-sm flex-shrink-0 mt-0.5 ${a.color}`}>{a.icon}</span>
                <div className="flex-1">
                  <p className="text-sm text-[var(--foreground)]">{a.text}</p>
                </div>
                <span className="text-xs text-[var(--muted-foreground)] flex-shrink-0 flex items-center gap-1">
                  <ClockIcon size={10} />{a.time}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create/Edit rule modal */}
      <Modal
        open={modal !== null}
        onClose={() => setModal(null)}
        title={modal === "create" ? "Create fraud detection rule" : "Edit rule"}
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Rule name"
            placeholder="e.g. Upfront payment request"
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          />
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Category</label>
              <select
                value={form.category}
                onChange={e => setForm(f => ({ ...f, category: e.target.value }))}
                className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
              >
                {["Contact", "Financial", "Content", "Company", "Communication"].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-[var(--foreground)]">Severity</label>
              <select
                value={form.severity}
                onChange={e => setForm(f => ({ ...f, severity: e.target.value }))}
                className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors"
              >
                {["low", "medium", "high", "critical"].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--foreground)]">Detection pattern</label>
            <textarea
              value={form.pattern}
              onChange={e => setForm(f => ({ ...f, pattern: e.target.value }))}
              placeholder="Regex pattern or keyword list, one per line…"
              rows={4}
              className="px-3.5 py-3 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors font-mono"
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" className="flex-1" onClick={() => setModal(null)}>Cancel</Button>
            <Button className="flex-1" onClick={handleSave} disabled={!form.name.trim()}>
              {modal === "create" ? "Create rule" : "Save changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal open={deleteModal !== null} onClose={() => setDeleteModal(null)} title="Delete rule" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-[var(--muted-foreground)]">
            Are you sure you want to delete this rule? This action cannot be undone and may affect active scam detection.
          </p>
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteModal(null)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => deleteModal && handleDelete(deleteModal)}>
              Delete rule
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
