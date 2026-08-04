// Next.js's documented, guaranteed-order startup hook: `register()` runs
// exactly once per server instance and is guaranteed to complete before the
// server handles any request — the correct place for one-time process
// initialization, instead of relying on whichever module happens to import
// another first (which is what the previous, less reliable version of this
// fix did). See src/lib/db.ts for why this alone is not sufficient to make
// the Atlas `mongodb+srv://` connection reliable, and what the actual fix
// is (the connection string format).
//
// `instrumentation.ts` is bundled for BOTH the Node.js and Edge runtimes,
// even in an app with no edge routes — a plain top-level `import
// '@/lib/configureDns'` (which imports `node:dns`) breaks the Edge bundle,
// since Edge doesn't support Node core modules. The dynamic import below is
// Next.js's own documented pattern for this exact situation: it keeps the
// Node-only module out of the Edge bundle's static dependency graph
// entirely, rather than just guarding the *call* at runtime.
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'edge') return;
  const { configureDns } = await import('@/lib/configureDns');
  configureDns();
}
