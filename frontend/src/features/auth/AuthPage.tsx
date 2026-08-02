import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ShieldCheckIcon,
  MailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  UserIcon,
  CheckIcon,
  ArrowRightIcon,
  Button,
  Input,
  Alert,
} from '@/components/ui';
import { useAuth } from '@/features/auth/AuthContext';
import { ApiClientError } from '@/lib/apiClient';

interface AuthPageProps {
  mode: 'login' | 'register';
}

const passwordStrength = (pw: string) => {
  if (!pw) return 0;
  let s = 0;
  if (pw.length >= 8) s++;
  if (/[A-Z]/.test(pw)) s++;
  if (/[0-9]/.test(pw)) s++;
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  return s;
};

export function AuthPage({ mode }: AuthPageProps) {
  const isLogin = mode === 'login';
  const { login, register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const strength = passwordStrength(password);
  const strengthLabel = ['', 'Weak', 'Fair', 'Good', 'Strong'][strength];
  const strengthColor = ['', 'bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'][
    strength
  ];

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !password || (!isLogin && !name)) {
      setError('Please fill in all fields.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(name, email, password);
      }
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : 'Something went wrong. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex">
      {/* Left panel */}
      <div className="hidden lg:flex flex-col w-[45%] bg-[var(--primary)] relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'radial-gradient(circle, white 1.5px, transparent 1.5px)',
            backgroundSize: '32px 32px',
          }}
        />
        <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-white/5 blur-3xl" />

        <Link to="/" className="relative p-8 flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span
            className="font-bold text-white text-lg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            JobCheck
          </span>
        </Link>

        <div className="relative flex-1 flex flex-col justify-center px-12 pb-16">
          <h2
            className="text-4xl font-extrabold text-white leading-tight mb-6"
            style={{ fontFamily: 'var(--font-display)', letterSpacing: '-0.02em' }}
          >
            Protect your career from job scams.
          </h2>
          <div className="space-y-4">
            {[
              'Rule-based fraud detection in seconds',
              'Clear evidence for every flagged signal',
              'Your full analysis history, saved',
              'Free to use — no credit card needed',
            ].map((item) => (
              <div key={item} className="flex items-center gap-3">
                <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                  <CheckIcon size={13} className="text-white" />
                </div>
                <span className="text-indigo-100 text-sm font-medium">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex flex-col justify-center items-center px-6 py-12">
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span
            className="font-bold text-[var(--foreground)] text-lg"
            style={{ fontFamily: 'var(--font-display)' }}
          >
            JobCheck
          </span>
        </Link>

        <div className="w-full max-w-md animate-scale-in">
          <div className="mb-8">
            <h1
              className="text-2xl font-extrabold text-[var(--foreground)] mb-1.5"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              {isLogin ? 'Welcome back' : 'Create your account'}
            </h1>
            <p className="text-[var(--muted-foreground)] text-sm">
              {isLogin
                ? 'Sign in to your JobCheck account'
                : 'Start analyzing job postings for free today'}
            </p>
          </div>

          {error && (
            <div className="mb-4">
              <Alert variant="error" onDismiss={() => setError('')}>
                {error}
              </Alert>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <Input
                label="Full name"
                placeholder="Alex Morgan"
                value={name}
                onChange={(e) => setName(e.target.value)}
                icon={<UserIcon size={16} />}
                autoComplete="name"
              />
            )}

            <Input
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={<MailIcon size={16} />}
              autoComplete="email"
            />

            <div className="space-y-2">
              <Input
                label="Password"
                type={showPw ? 'text' : 'password'}
                placeholder={isLogin ? 'Your password' : 'Create a strong password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                icon={<LockIcon size={16} />}
                iconRight={showPw ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
                onIconRightClick={() => setShowPw(!showPw)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
              />
              {!isLogin && password && (
                <div className="space-y-1.5">
                  <div className="flex gap-1">
                    {[1, 2, 3, 4].map((i) => (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength ? strengthColor : 'bg-[var(--muted)]'}`}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Password strength:{' '}
                    <span
                      className={`font-semibold ${strength >= 3 ? 'text-emerald-600' : strength === 2 ? 'text-blue-500' : 'text-amber-500'}`}
                    >
                      {strengthLabel}
                    </span>
                  </p>
                </div>
              )}
            </div>

            <Button
              type="submit"
              size="lg"
              loading={loading}
              className="w-full"
              iconRight={!loading ? <ArrowRightIcon size={15} /> : undefined}
            >
              {isLogin ? 'Sign in to JobCheck' : 'Create free account'}
            </Button>
          </form>

          <p className="text-sm text-[var(--muted-foreground)] text-center mt-6">
            {isLogin ? "Don't have an account? " : 'Already have an account? '}
            <button
              onClick={() => navigate(isLogin ? '/register' : '/login')}
              className="text-[var(--primary)] font-semibold hover:underline"
            >
              {isLogin ? 'Sign up free' : 'Sign in'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
