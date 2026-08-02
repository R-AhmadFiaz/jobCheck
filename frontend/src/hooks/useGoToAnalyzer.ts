import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/features/auth/AuthContext';

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
 */
export function useGoToAnalyzer() {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (options?: { prefill?: string }) => {
    if (user) {
      navigate('/analyze', {
        state: options?.prefill ? { prefill: options.prefill } : undefined,
      });
      return;
    }
    navigate('/');
  };
}
