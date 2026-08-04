import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Built from an actual inventory of this app's client-side needs (checked
// before writing this, not copied from a generic template):
//
// - script-src needs 'unsafe-inline': the App Router's RSC streaming model
//   injects inline <script> tags carrying per-request serialized payload
//   (`self.__next_f.push(...)`) on every page load — confirmed by curling
//   the actual rendered HTML. Their content is different on every request,
//   so they can't be allow-listed by a fixed hash, and this app
//   deliberately has no middleware/proxy.ts (a prior, separate decision —
//   see AGENTS.md/hooks/useDarkMode.ts's own SSR-safety notes) to generate
//   the per-request nonce Next.js's own nonce-based CSP pattern requires.
//   Adding that would also force every currently-static page
//   (/, /login, /dashboard, ...) into dynamic rendering — a bigger
//   rendering-strategy change than "add response headers". 'unsafe-eval'
//   is added in development only, matching Next.js's own guidance (React
//   uses eval there to reconstruct server error stacks; neither React nor
//   Next.js use eval in production).
// - style-src needs 'unsafe-inline': the UI uses React's `style={{...}}`
//   prop extensively (40+ call sites — font-family declarations, dynamic
//   progress-bar widths, score-ring offsets), which renders as inline
//   `style="..."` attributes. Also needs fonts.googleapis.com: globals.css
//   loads Google Fonts via `@import url(...)`, which the browser fetches
//   as a real stylesheet request.
// - font-src needs fonts.gstatic.com: the CSS fonts.googleapis.com serves
//   references the actual .woff2 files from that separate domain.
// - connect-src/img-src stay at 'self' (+ data: for img-src): the frontend
//   only ever calls relative /api/v1/* paths (confirmed — no cross-origin
//   fetch target anywhere in client code), and no client-rendered <img>
//   currently points anywhere but same-origin. The Groq/Gemini AI calls are
//   made entirely server-side (inside Route Handlers), never by the
//   browser, so those domains do not need to appear here at all.
const cspDirectives = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isProd ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "img-src 'self' data:",
  "font-src 'self' https://fonts.gstatic.com",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'self'",
  ...(isProd ? ["upgrade-insecure-requests"] : []),
];

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Content-Security-Policy", value: cspDirectives.join("; ") },
  // HSTS only makes sense (and is only honored by browsers) over HTTPS —
  // meaningless in local dev, which runs on plain http://localhost.
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" }]
    : []),
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
