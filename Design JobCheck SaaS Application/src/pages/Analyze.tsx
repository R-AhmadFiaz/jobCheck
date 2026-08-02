import { useState, useRef } from "react"
import {
  Card, Button, Tabs, Alert,
  ZapIcon, LinkIcon, UploadIcon, SearchIcon, InfoIcon,
  CheckCircleIcon, AlertTriangleIcon, XCircleIcon, ShieldCheckIcon,
} from "../components/ui"
import type { Page } from "../components/ui"

interface AnalyzeProps { onNavigate: (p: Page) => void }

const tips = [
  { icon: <CheckCircleIcon size={14} className="text-emerald-500" />, text: "Include the full job description for the most accurate analysis." },
  { icon: <AlertTriangleIcon size={14} className="text-amber-500" />, text: "Watch for vague salary ranges like '$5K–$15K/week' — a common red flag." },
  { icon: <InfoIcon size={14} className="text-blue-500" />, text: "Legitimate companies always use official business email domains." },
  { icon: <XCircleIcon size={14} className="text-red-500" />, text: "Never pay upfront for training materials or equipment — that's always a scam." },
  { icon: <CheckCircleIcon size={14} className="text-emerald-500" />, text: "Verify the company exists independently before sharing any personal info." },
]

const sampleJob = `Senior Remote Marketing Manager — $120K–$160K/year

About us: We are a fast-growing startup revolutionizing the global digital marketing space. Our team is 100% remote and we operate across 30+ countries.

Responsibilities:
- Develop and execute marketing strategies
- Manage a virtual team of 10+ marketers
- Report directly to C-suite

Requirements:
- 5+ years experience in digital marketing
- Strong communication skills
- Must be a self-starter who can work independently

What we offer:
- Competitive salary (paid weekly via CashApp or Zelle)
- Full benefits
- Flexible hours — work from anywhere!
- Career growth opportunities

To apply: Email your CV to hiring.manager2024@gmail.com along with your WhatsApp number.

Note: You will be required to purchase your initial workstation equipment ($350) which will be fully reimbursed in your first paycheck.`

export default function Analyze({ onNavigate }: AnalyzeProps) {
  const [tab, setTab] = useState("paste")
  const [text, setText] = useState("")
  const [url, setUrl] = useState("")
  const [analyzing, setAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [dragOver, setDragOver] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleAnalyze = () => {
    if (!text.trim() && !url.trim()) return
    setAnalyzing(true)
    setProgress(0)
    const steps = [10, 25, 40, 58, 72, 85, 95, 100]
    let i = 0
    const tick = () => {
      if (i < steps.length) {
        setProgress(steps[i++])
        setTimeout(tick, 300 + Math.random() * 200)
      } else {
        setTimeout(() => {
          setAnalyzing(false)
          onNavigate("results")
        }, 400)
      }
    }
    tick()
  }

  const loadSample = () => {
    setText(sampleJob)
    setTab("paste")
    textareaRef.current?.focus()
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <h1 className="text-2xl font-extrabold text-[var(--foreground)]" style={{ fontFamily: "var(--font-display)" }}>
          Analyze a Job Posting
        </h1>
        <p className="text-[var(--muted-foreground)] text-sm mt-1">
          Paste the full job description or submit a URL. Our AI checks 40+ fraud signals.
        </p>
      </div>

      {analyzing ? (
        /* Analyzing overlay */
        <Card className="animate-scale-in">
          <div className="py-12 flex flex-col items-center text-center gap-6">
            <div className="relative w-20 h-20">
              <div className="absolute inset-0 rounded-full bg-[var(--primary)]/10 animate-ping" />
              <div className="relative w-20 h-20 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <ShieldCheckIcon size={32} className="text-white" />
              </div>
            </div>

            <div>
              <h2 className="text-xl font-bold text-[var(--foreground)] mb-2" style={{ fontFamily: "var(--font-display)" }}>
                Analyzing job posting…
              </h2>
              <p className="text-sm text-[var(--muted-foreground)]">
                Checking content signals, company data, and recruiter patterns
              </p>
            </div>

            <div className="w-full max-w-sm space-y-3">
              <div className="h-2.5 rounded-full bg-[var(--muted)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-blue-500 transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-xs text-[var(--muted-foreground)]">
                <span>
                  {progress < 25 ? "Parsing job description…" :
                   progress < 50 ? "Checking 40+ fraud signals…" :
                   progress < 75 ? "Verifying company identity…" :
                   progress < 95 ? "Scoring risk indicators…" :
                   "Finalizing report…"}
                </span>
                <span className="font-mono font-semibold">{progress}%</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center gap-2 max-w-md">
              {[
                "Salary analysis", "Company lookup", "Email pattern", "Red flag scan",
                "Recruiter check", "Text anomaly", "Domain verify", "Scam match"
              ].map((check, i) => (
                <span
                  key={check}
                  className={`px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-300
                    ${i * 12 < progress
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                      : "bg-[var(--muted)] text-[var(--muted-foreground)]"}`}
                >
                  {i * 12 < progress ? "✓ " : ""}{check}
                </span>
              ))}
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Input area */}
          <div className="lg:col-span-2 space-y-4">
            <Card padding="none" className="animate-fade-up">
              {/* Tabs */}
              <div className="px-4 pt-4 pb-0">
                <Tabs
                  active={tab}
                  onChange={setTab}
                  tabs={[
                    { id: "paste", label: "Paste text",     icon: <ZapIcon size={14} /> },
                    { id: "url",   label: "Submit URL",     icon: <LinkIcon size={14} /> },
                    { id: "upload",label: "Upload file",    icon: <UploadIcon size={14} /> },
                  ]}
                />
              </div>

              <div className="p-4">
                {tab === "paste" && (
                  <div
                    className={`relative transition-all ${dragOver ? "ring-2 ring-[var(--primary)] ring-offset-2 rounded-xl" : ""}`}
                    onDragOver={e => { e.preventDefault(); setDragOver(true) }}
                    onDragLeave={() => setDragOver(false)}
                    onDrop={e => {
                      e.preventDefault()
                      setDragOver(false)
                      const file = e.dataTransfer.files[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = ev => setText(ev.target?.result as string ?? "")
                        reader.readAsText(file)
                      }
                    }}
                  >
                    <textarea
                      ref={textareaRef}
                      value={text}
                      onChange={e => setText(e.target.value)}
                      placeholder="Paste the full job description here…&#10;&#10;The more detail you include, the more accurate the analysis will be. Include the job title, responsibilities, requirements, salary information, and contact details."
                      className="w-full h-72 p-4 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none resize-none focus:border-[var(--primary)] transition-colors font-mono leading-relaxed"
                      style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}
                    />
                    {dragOver && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-xl bg-[var(--primary)]/5 border-2 border-dashed border-[var(--primary)]">
                        <div className="text-center">
                          <UploadIcon size={28} className="text-[var(--primary)] mx-auto mb-2" />
                          <p className="text-sm font-semibold text-[var(--primary)]">Drop file to import</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {tab === "url" && (
                  <div className="space-y-4">
                    <div className="relative flex items-center rounded-xl border border-[var(--border-strong)] bg-[var(--card)] focus-within:border-[var(--primary)] transition-colors">
                      <SearchIcon size={16} className="absolute left-3.5 text-[var(--muted-foreground)]" />
                      <input
                        value={url}
                        onChange={e => setUrl(e.target.value)}
                        placeholder="https://www.linkedin.com/jobs/view/..."
                        className="w-full pl-10 pr-4 py-3.5 bg-transparent text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none"
                      />
                    </div>
                    <Alert variant="info" title="URL scanning supports 40+ job boards">
                      LinkedIn, Indeed, Glassdoor, ZipRecruiter, Wellfound, Remote.co, and more. We fetch and parse the listing automatically.
                    </Alert>
                  </div>
                )}

                {tab === "upload" && (
                  <div
                    onClick={() => document.getElementById("file-input")?.click()}
                    className="flex flex-col items-center justify-center h-48 rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] transition-colors cursor-pointer group"
                  >
                    <input id="file-input" type="file" accept=".txt,.pdf,.docx" className="sr-only"
                      onChange={e => {
                        const file = e.target.files?.[0]
                        if (file) {
                          const reader = new FileReader()
                          reader.onload = ev => { setText(ev.target?.result as string ?? ""); setTab("paste") }
                          reader.readAsText(file)
                        }
                      }}
                    />
                    <UploadIcon size={28} className="text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors mb-3" />
                    <p className="text-sm font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                      Click to upload
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)] mt-1">TXT, PDF, or DOCX · Max 5MB</p>
                  </div>
                )}
              </div>

              {/* Actions */}
              <div className="px-4 pb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {tab === "paste" && (
                    <>
                      <span className="text-xs text-[var(--muted-foreground)] font-mono">{text.length.toLocaleString()} chars</span>
                      {text && (
                        <button onClick={() => setText("")} className="text-xs text-[var(--muted-foreground)] hover:text-[var(--danger)] transition-colors">
                          Clear
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="flex gap-2">
                  {!text && tab === "paste" && (
                    <Button variant="ghost" size="sm" onClick={loadSample}>
                      Load example
                    </Button>
                  )}
                  <Button
                    size="md"
                    icon={<ZapIcon size={15} />}
                    onClick={handleAnalyze}
                    disabled={(tab === "paste" && !text.trim()) || (tab === "url" && !url.trim())}
                    className="min-w-[140px]"
                  >
                    Analyze now
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Tips panel */}
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
                    <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">{tip.text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card>
              <h3 className="font-bold text-[var(--foreground)] mb-3">What we check</h3>
              <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                {[
                  "Salary claims", "Email domain", "Company verify",
                  "Grammar patterns", "Payment requests", "Urgency language",
                  "Recruiter trust", "Job board match", "URL safety",
                  "Contact info"
                ].map(check => (
                  <div key={check} className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
                    <CheckCircleIcon size={11} className="text-[var(--primary)] flex-shrink-0" />
                    {check}
                  </div>
                ))}
              </div>
            </Card>

            <Card className="bg-[var(--primary)] border-0">
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheckIcon size={16} className="text-indigo-200" />
                <span className="text-xs font-semibold text-indigo-200 uppercase tracking-wider">Pro tip</span>
              </div>
              <p className="text-sm text-white leading-relaxed">
                For best results, include the original job URL along with the full text. We cross-reference both sources.
              </p>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
