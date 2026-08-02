import { useState } from "react"
import {
  Card, Button, Input, Alert, Badge, Tabs, Modal, Avatar, StatusChip,
  UserIcon, MailIcon, LockIcon, ShieldCheckIcon, BellIcon, CreditCardIcon,
  KeyIcon, TrashIcon, EyeIcon, EditIcon, CheckCircleIcon, LogOutIcon,
  ClockIcon, GlobeIcon, ZapIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface ProfileProps { onNavigate: (p: Page) => void }

const sessions = [
  { device: "Chrome on macOS",        location: "San Francisco, CA",   ip: "104.12.xxx.xxx", time: "Active now",   current: true  },
  { device: "Firefox on Windows 11",  location: "New York, NY",        ip: "74.201.xxx.xxx", time: "2 hours ago",  current: false },
  { device: "Safari on iPhone 15 Pro",location: "San Francisco, CA",   ip: "104.12.xxx.xxx", time: "Yesterday",    current: false },
]

export default function Profile({ onNavigate }: ProfileProps) {
  const [tab, setTab] = useState("account")
  const [editModal, setEditModal] = useState(false)
  const [deleteModal, setDeleteModal] = useState(false)
  const [saved, setSaved] = useState(false)
  const [name, setName] = useState("Alex Morgan")
  const [email, setEmail] = useState("alex.morgan@example.com")
  const [notifications, setNotifications] = useState({
    analysisComplete: true,
    weeklyDigest: true,
    scamAlerts: true,
    productUpdates: false,
  })

  const handleSave = () => {
    setSaved(true)
    setTimeout(() => setSaved(false), 3000)
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-5 animate-fade-up">
        <div className="relative">
          <Avatar name="Alex Morgan" size="xl" />
          <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center text-white shadow-sm hover:brightness-110 transition-all">
            <EditIcon size={12} />
          </button>
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
            Alex Morgan
          </h1>
          <p className="text-[var(--muted-foreground)] text-sm">alex.morgan@example.com</p>
          <div className="flex items-center gap-2 mt-1.5">
            <Badge variant="purple">Pro plan</Badge>
            <Badge variant="safe"><CheckCircleIcon size={10} /> Verified</Badge>
            <span className="text-xs text-[var(--muted-foreground)]">Member since Feb 2025</span>
          </div>
        </div>
      </div>

      <Tabs
        active={tab}
        onChange={setTab}
        tabs={[
          { id: "account",  label: "Account",         icon: <UserIcon size={14} /> },
          { id: "security", label: "Security",        icon: <ShieldCheckIcon size={14} /> },
          { id: "notifications", label: "Notifications", icon: <BellIcon size={14} /> },
          { id: "billing",  label: "Billing",         icon: <CreditCardIcon size={14} /> },
        ]}
        className="animate-fade-up stagger-1"
      />

      {tab === "account" && (
        <div className="space-y-4 animate-fade-in">
          {saved && (
            <Alert variant="success">Changes saved successfully.</Alert>
          )}

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-5">Personal Information</h3>
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Input
                  label="Full name"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  icon={<UserIcon size={15} />}
                />
                <Input
                  label="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  icon={<MailIcon size={15} />}
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Occupation</label>
                  <select className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors">
                    <option>Software Engineer</option>
                    <option>Designer</option>
                    <option>Product Manager</option>
                    <option>Marketing</option>
                    <option>Freelancer</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium text-[var(--foreground)]">Country</label>
                  <select className="px-3.5 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] outline-none focus:border-[var(--primary)] transition-colors">
                    <option>United States</option>
                    <option>United Kingdom</option>
                    <option>Canada</option>
                    <option>Australia</option>
                    <option>Germany</option>
                    <option>India</option>
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="outline" size="sm">Discard</Button>
                <Button size="sm" onClick={handleSave}>Save changes</Button>
              </div>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">Usage Statistics</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Analyses run",  val: "47" },
                { label: "Scams caught",  val: "9" },
                { label: "Jobs saved",    val: "14" },
              ].map(s => (
                <div key={s.label} className="text-center p-4 rounded-xl bg-[var(--muted)]">
                  <p className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>{s.val}</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </Card>

          <Card className="border-red-200 dark:border-red-900">
            <h3 className="font-bold text-red-600 mb-2">Danger Zone</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Permanently delete your account and all associated data. This action cannot be undone.
            </p>
            <Button variant="danger" size="sm" icon={<TrashIcon size={13} />} onClick={() => setDeleteModal(true)}>
              Delete account
            </Button>
          </Card>
        </div>
      )}

      {tab === "security" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-5">Change Password</h3>
            <div className="space-y-4 max-w-md">
              <Input label="Current password" type="password" placeholder="••••••••" icon={<LockIcon size={15} />} />
              <Input label="New password" type="password" placeholder="••••••••" icon={<LockIcon size={15} />} helper="At least 8 characters, including uppercase and numbers." />
              <Input label="Confirm new password" type="password" placeholder="••••••••" icon={<LockIcon size={15} />} />
              <Button size="sm">Update password</Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="font-bold text-[var(--foreground)] mb-1">Two-factor authentication</h3>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Add an extra layer of security to your account. Use an authenticator app to generate one-time codes.
                </p>
              </div>
              <StatusChip status="inactive" />
            </div>
            <div className="mt-4">
              <Button variant="secondary" size="sm" icon={<ShieldCheckIcon size={13} />}>
                Enable 2FA
              </Button>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-[var(--foreground)]">Active Sessions</h3>
              <Button variant="danger" size="sm" icon={<LogOutIcon size={13} />}>
                Revoke all
              </Button>
            </div>
            <div className="space-y-3">
              {sessions.map((s, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-xl bg-[var(--muted)]/50 border border-[var(--border)]">
                  <div className="w-10 h-10 rounded-xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center flex-shrink-0">
                    <GlobeIcon size={18} className="text-[var(--muted-foreground)]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-[var(--foreground)]">{s.device}</p>
                      {s.current && <Badge variant="safe">Current</Badge>}
                    </div>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {s.location} · {s.ip} · {s.time}
                    </p>
                  </div>
                  {!s.current && (
                    <Button variant="ghost" size="sm" icon={<LogOutIcon size={12} />}>
                      Revoke
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">API Keys</h3>
            <div className="flex items-center gap-3 p-4 rounded-xl bg-[var(--muted)] border border-[var(--border)] font-mono text-sm text-[var(--muted-foreground)]">
              <KeyIcon size={16} className="text-[var(--primary)] flex-shrink-0" />
              <span className="flex-1 truncate">jc_live_••••••••••••••••••••••••••••••••</span>
              <Button variant="ghost" size="sm" icon={<EyeIcon size={13} />}>Reveal</Button>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Use this key to access the JobCheck API. Keep it secret.
            </p>
          </Card>
        </div>
      )}

      {tab === "notifications" && (
        <div className="space-y-4 animate-fade-in">
          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-5">Email Notifications</h3>
            <div className="space-y-4">
              {[
                { key: "analysisComplete" as const, label: "Analysis complete", desc: "Notified when an AI analysis finishes." },
                { key: "weeklyDigest"    as const, label: "Weekly digest",       desc: "A summary of your analyses and new scam trends." },
                { key: "scamAlerts"      as const, label: "Scam alerts",          desc: "Real-time alerts for new scams matching your job searches." },
                { key: "productUpdates" as const, label: "Product updates",      desc: "New features and improvements to JobCheck." },
              ].map(item => (
                <div key={item.key} className="flex items-center justify-between gap-4 py-3 border-b border-[var(--border)] last:border-0">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">{item.label}</p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-0.5">{item.desc}</p>
                  </div>
                  <button
                    onClick={() => setNotifications(n => ({ ...n, [item.key]: !n[item.key] }))}
                    className={`relative inline-flex h-6 w-11 rounded-full transition-colors duration-200 flex-shrink-0 ${
                      notifications[item.key] ? "bg-[var(--primary)]" : "bg-[var(--muted)]"
                    }`}
                  >
                    <span
                      className={`inline-block w-5 h-5 bg-white rounded-full shadow-sm transition-transform duration-200 mt-0.5 ${
                        notifications[item.key] ? "translate-x-5" : "translate-x-0.5"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {tab === "billing" && (
        <div className="space-y-4 animate-fade-in">
          {/* Current plan */}
          <Card className="gradient-border">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-[var(--foreground)]">Pro Plan</h3>
                  <Badge variant="purple">Current</Badge>
                </div>
                <p className="text-3xl font-extrabold text-[var(--foreground)] mt-2" style={{ fontFamily: "var(--font-display)" }}>
                  $9<span className="text-base font-normal text-[var(--muted-foreground)]">/month</span>
                </p>
                <p className="text-sm text-[var(--muted-foreground)] mt-1">Next billing date: July 1, 2026</p>
              </div>
              <Button variant="outline" size="sm">Manage plan</Button>
            </div>
            <div className="mt-5 pt-4 border-t border-[var(--border)] grid sm:grid-cols-3 gap-3">
              {[
                { label: "Analyses", val: "Unlimited" },
                { label: "URL scanning", val: "Included" },
                { label: "Recruiter lookup", val: "Included" },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-2">
                  <CheckCircleIcon size={14} className="text-emerald-500" />
                  <span className="text-sm text-[var(--foreground)]">{f.label}: <strong>{f.val}</strong></span>
                </div>
              ))}
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">Payment Method</h3>
            <div className="flex items-center gap-3 p-4 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40">
              <div className="w-10 h-7 rounded bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center">
                <span className="text-white text-xs font-bold">VISA</span>
              </div>
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">•••• •••• •••• 4242</p>
                <p className="text-xs text-[var(--muted-foreground)]">Expires 08/2028</p>
              </div>
              <Button variant="ghost" size="sm" className="ml-auto">Update</Button>
            </div>
          </Card>

          <Card>
            <h3 className="font-bold text-[var(--foreground)] mb-4">Billing History</h3>
            <div className="divide-y divide-[var(--border)]">
              {[
                { date: "Jun 1, 2026", amount: "$9.00", status: "Paid" },
                { date: "May 1, 2026", amount: "$9.00", status: "Paid" },
                { date: "Apr 1, 2026", amount: "$9.00", status: "Paid" },
              ].map(inv => (
                <div key={inv.date} className="flex items-center justify-between py-3">
                  <div>
                    <p className="text-sm font-semibold text-[var(--foreground)]">Pro Plan · Monthly</p>
                    <p className="text-xs text-[var(--muted-foreground)] flex items-center gap-1"><ClockIcon size={10} />{inv.date}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="safe">{inv.status}</Badge>
                    <span className="font-mono font-semibold text-sm text-[var(--foreground)]">{inv.amount}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Delete account modal */}
      <Modal open={deleteModal} onClose={() => setDeleteModal(false)} title="Delete account" size="sm">
        <div className="space-y-4">
          <Alert variant="error" title="This action is permanent">
            Deleting your account will remove all your analyses, saved jobs, and personal data. This cannot be undone.
          </Alert>
          <Input label="Type 'DELETE' to confirm" placeholder="DELETE" />
          <div className="flex gap-3">
            <Button variant="outline" className="flex-1" onClick={() => setDeleteModal(false)}>Cancel</Button>
            <Button variant="danger" className="flex-1" onClick={() => { setDeleteModal(false); onNavigate("landing") }}>
              Delete my account
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
