import dns from 'node:dns';

// Defense-in-depth only — this does NOT fully solve the Atlas SRV-lookup
// reliability problem by itself (see src/instrumentation.ts and db.ts for
// the actual fix and the evidence behind it). It's still worth keeping:
// Node's DNS resolver (c-ares) auto-detects "which DNS server to query" per
// process, and on this Windows machine that auto-detection was found
// returning 127.0.0.1, even though no network adapter is configured with
// that address and nothing listens on port 53 locally — a Node/Windows
// quirk, not an Atlas/URI/network problem (confirmed: the OS's own resolver
// resolves the same records correctly). Side-effect-only module, imported
// for its effect from every process that might need DNS resolution for a
// `mongodb+srv://` URI — the Next.js app (via instrumentation.ts) and the
// standalone seed scripts each start a separate Node process and each do
// their own DNS server auto-detection.
export function configureDns(): void {
  dns.setServers(['1.1.1.1', '8.8.8.8']);
}
