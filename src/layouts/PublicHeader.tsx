import Link from 'next/link';
import { ShieldCheckIcon } from '@/components/ui';

// Minimal brand-only header for pages reached outside the authenticated
// dashboard chrome and outside the full marketing nav (e.g. the guest
// /results/:id route) — same visual language as LandingPage's nav / the
// dashboard sidebar's brand mark, just without any nav links or auth actions.
export function PublicHeader() {
  return (
    <header className="sticky top-0 z-30 bg-[var(--background)]/80 backdrop-blur-xl border-b border-[var(--border)]">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[var(--primary)] flex items-center justify-center">
            <ShieldCheckIcon size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg" style={{ fontFamily: 'var(--font-display)' }}>
            JobCheck
          </span>
        </Link>
      </div>
    </header>
  );
}
