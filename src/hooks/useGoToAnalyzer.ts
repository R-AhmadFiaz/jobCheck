'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/features/auth/AuthContext';
import { setPendingPrefill } from '@/lib/pendingPrefill';

/**
 * The ONLY sanctioned way to send a user toward "go analyze a job" from
 * anywhere in the app.
 *
 * Logged-in users go to the authenticated /analyze page. Guests are NEVER
 * navigated to /analyze, /login, or /register by this — they're sent to the
 * homepage, where the real public analyzer input lives.
 *
 * This exists because the guest/auth branch used to be copy-pasted inline
 * (`user ? '/analyze' : ...`) in several unrelated components, each written
 * at a different time with a different — and sometimes wrong — fallback for
 * guests (one pointed at /register). Nothing enforced consistency, so any
 * future "Analyze" button risked reintroducing the bug by omitting the check
 * entirely or copying the wrong existing one.
 *
 * Do not write a new inline `user ? '/analyze' : ...` check. Call this hook
 * instead — it is the single place this decision is made.
 *
 * Next.js migration: `prefill` used to travel via React Router's
 * `navigate(url, { state })`, which has no equivalent in Next.js's
 * URL-based router — see lib/pendingPrefill.ts for the replacement
 * mechanism (unused by any current call site, same as before this
 * migration, but preserved rather than dropped).
 */
export function useGoToAnalyzer() {
  const router = useRouter();
  const { user } = useAuth();

  return (options?: { prefill?: string }) => {
    if (user) {
      if (options?.prefill) setPendingPrefill(options.prefill);
      router.push('/analyze');
      return;
    }
    router.push('/');
  };
}
