import { useState } from "react"
import {
  ShieldCheckIcon, MailIcon, LockIcon, EyeIcon, EyeOffIcon,
  UserIcon, CheckIcon, ArrowRightIcon, GlobeIcon,
  Button, Input, Alert,
} from "../components/ui"
import type { Page } from "../components/ui"

interface AuthProps {
  mode: "login" | "register"
  onNavigate: (p: Page) => void
}

const passwordStrength = (pw: string) => {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (/[A-Z]/.test(pw)) s++
  if (/[0-9]/.test(pw)) s++
  if (/[^A-Za-z0-9]/.test(pw)) s++
  return s
}

export default function Auth({ mode, onNavigate }: AuthProps) {
  const isLogin = mode === "login"
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [name, setName] = useState("")
  const [showPw, setShowPw] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const strength = passwordStrength(password)
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong"][strength]
  const strengthColor = ["", "bg-red-500", "bg-amber-500", "bg-blue-500", "bg-emerald-500"][strength]

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password || (!isLogin && !name)) {
      setError("Please fill in all fields.")
      return
    }
    setError("")
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      onNavigate("dashboard")
    }, 1200)
  }

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Left panel — illustration / brand */}
      <div className="hidden lg:flex flex-col w-[45%] bg-[var(--primary)] relative overflow-hidden">
        {/* mesh */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: "radial-gradient(circle, white 1.5px, transparent 1.5px)",
          backgroundSize: "32px 32px"
        }} />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        {/* Logo */}
        <div className="relative p-8 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span className="font-bold text-white text-lg" style={{ fontFamily: "var(--font-display)" }}>JobCheck</span>
        </div>

        {/* Content */}
        <div className="relative flex-1 flex flex-col justify-center px-12 pb-16">
          <h2 className="text-4xl font-extrabold text-white leading-tight mb-6" style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}>
            Protect your career from job scams.
          </h2>
          <div className="space-y-4">
            {[
              "AI-powered fraud detection in seconds",
              "50,000+ verified scam patterns",
              "Recruiter & company trust scores",
              "Community-powered intelligence",
            ].map(item => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={13} className="text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>

          {/* Mini trust bar */}
          <div className="mt-12 p-5 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              {["SN", "ML", "KP", "TR"].map(i => (
                <div key={i} className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold text-white">
                  {i}
                </div>
              ))}
              <span className="text-xs text-indigo-200 ml-1">+120K users</span>
            </div>
            <p className="text-sm text-white font-medium">"JobCheck flagged 3 scams before I even replied."</p>
            <p className="text-xs text-indigo-300 mt-1">— Sarah N., Product Manager</p>
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span className="font-bold text-[var(--foreground)] text-lg" style={{ fontFamily: "var(--font-display)" }}>JobCheck</span>
        </div>

        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8">
            <h1 className="text-2xl font-extrabold text-[var(--foreground)] mb-1.5" style={{ fontFamily: "var(--font-display)" }}>
              {isLogin ? "Welcome back" : "Create your account"}
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              {isLogin
                ? "Sign in to your JobCheck account"
                : "Start analyzing job postings for free today"}
            </p>
          </div>

          {/* Social placeholders */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Google
            </button>
            <button className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border-strong)] bg-[var(--card)] text-sm font-medium text-[var(--foreground)] hover:bg-[var(--muted)] transition-colors">
              <GlobeIcon size={15} className="text-[var(--muted-foreground)]" />
              LinkedIn
            </button>
          </div>

          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 h-px bg-[var(--border)]" />
            <span className="text-xs text-[var(--muted-foreground)] font-medium">or continue with email</span>
            <div className="flex-1 h-px bg-[var(--border)]" />
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error" onDismiss={() => setError("")}>{error}</Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Full name"
                placeholder="Alex Morgan"
                value={name}
                onChange={e => setName(e.target.value)}
                icon={<UserIcon size={16} />}
                autoComplete="name"
              />
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              icon={<MailIcon size={16} />}
              autoComplete="email"
            />

            <div className="space-y-2">
              <Input
                label="Password"
                type={showPw ? "text" : "password"}
                placeholder={isLogin ? "Your password" : "Create a strong password"}
                value={password}
                onChange={e => setPassword(e.target.value)}
                icon={<LockIcon size={16} />}
                iconRight={showPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                onIconRightClick={() => setShowPw(!showPw)}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
              {!isLogin && password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map(i => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : "bg-[var(--muted)]"}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Password strength: <span className={`font-semibold ${strength >= 3 ? "text-emerald-600" : strength === 2 ? "text-blue-500" : "text-amber-500"}`}>{strengthLabel}</span>
                  </p>
                </div>
              )}
            </div>

            {isLogin && (
              <div className="flex justify-end">
                <button type="button" className="text-sm text-[var(--primary)] font-medium hover:underline">
                  Forgot password?
                </button>
              </div>
            )}

            {!isLogin && (
              <p className="text-xs text-[var(--muted-foreground)] leading-relaxed">
                By creating an account you agree to our{" "}
                <a href="#" className="text-[var(--primary)] hover:underline">Terms of Service</a> and{" "}
                <a href="#" className="text-[var(--primary)] hover:underline">Privacy Policy</a>.
              </p>
            )}

            <Button type="submit" size="lg" loading={loading} className="w-full" iconRight={!loading ? <ArrowRightIcon size={15} /> : undefined}>
              {isLogin ? "Sign in to JobCheck" : "Create free account"}
            </Button>
          </form>

          <p className="text-sm text-[var(--muted-foreground)] text-center mt-6">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <button
              onClick={() => onNavigate(isLogin ? "register" : "login")}
              className="text-[var(--primary)] font-semibold hover:underline"
            >
              {isLogin ? "Sign up free" : "Sign in"}
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
