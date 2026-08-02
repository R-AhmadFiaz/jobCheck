import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { load } from 'cheerio';
import { env } from '@/config/env';

export interface UrlExtractionMetadata {
  success: boolean;
  statusCode: number | null;
  contentType: string | null;
  truncated: boolean;
  error: string | null;
}

export interface UrlExtractionResult {
  url: string;
  title: string | null;
  extractedText: string;
  metadata: UrlExtractionMetadata;
}

const MAX_REDIRECTS = 3;
const USER_AGENT = 'JobCheckBot/1.0 (job-posting fraud analysis; +https://jobcheck.example)';

function failure(
  url: string,
  error: string,
  statusCode: number | null = null,
): UrlExtractionResult {
  return {
    url,
    title: null,
    extractedText: '',
    metadata: { success: false, statusCode, contentType: null, truncated: false, error },
  };
}

// SSRF guard, part 1: reject anything in a private/loopback/link-local/reserved
// IPv4 range. Applied to both literal IPs in the URL and every address a
// hostname resolves to (part 2, below) — a hostname is not safe just because
// it isn't a literal private IP itself (DNS can point anywhere).
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part))) return true;
  const [a, b] = parts as [number, number, number, number];
  if (a === 0 || a === 10 || a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true; // shared/CGNAT space
  if (a >= 224) return true; // multicast + reserved
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;
  if (normalized.startsWith('fe80:')) return true; // link-local
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true; // unique local fc00::/7
  if (normalized.startsWith('::ffff:')) {
    const mapped = normalized.slice('::ffff:'.length);
    return isPrivateIPv4(mapped);
  }
  return false;
}

// SSRF guard, part 2: resolve the hostname ourselves and check every returned
// address before allowing the fetch to proceed — this is also re-run on every
// redirect hop (see safeFetch), which is what actually closes the DNS-rebinding
// hole a naive "check once, then let the HTTP client follow redirects" would leave open.
async function assertPublicHostname(hostname: string): Promise<void> {
  const literalVersion = isIP(hostname);
  if (literalVersion === 4) {
    if (isPrivateIPv4(hostname)) throw new Error('URL resolves to a private or internal address.');
    return;
  }
  if (literalVersion === 6) {
    if (isPrivateIPv6(hostname)) throw new Error('URL resolves to a private or internal address.');
    return;
  }

  const records = await lookup(hostname, { all: true });
  if (records.length === 0) throw new Error('Could not resolve the hostname.');
  for (const record of records) {
    const isPrivate =
      record.family === 4 ? isPrivateIPv4(record.address) : isPrivateIPv6(record.address);
    if (isPrivate) throw new Error('URL resolves to a private or internal address.');
  }
}

async function safeFetch(
  targetUrl: string,
  timeoutMs: number,
  redirectsLeft: number,
): Promise<{ response: Response; finalUrl: string }> {
  const parsed = new URL(targetUrl);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new Error('Only http:// and https:// URLs are supported.');
  }
  await assertPublicHostname(parsed.hostname);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(parsed.toString(), {
      signal: controller.signal,
      redirect: 'manual',
      headers: { 'User-Agent': USER_AGENT, Accept: 'text/html,application/xhtml+xml' },
    });
  } finally {
    clearTimeout(timer);
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get('location');
    if (!location) throw new Error('The page redirected without a destination.');
    if (redirectsLeft <= 0) throw new Error('Too many redirects.');
    const nextUrl = new URL(location, parsed).toString();
    return safeFetch(nextUrl, timeoutMs, redirectsLeft - 1);
  }

  return { response, finalUrl: parsed.toString() };
}

async function readBodyCapped(
  response: Response,
  maxBytes: number,
): Promise<{ text: string; truncated: boolean }> {
  if (!response.body) return { text: '', truncated: false };

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let total = 0;
  let truncated = false;

  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    total += value.byteLength;
    if (total > maxBytes) {
      const alreadyRead = total - value.byteLength;
      const remaining = maxBytes - alreadyRead;
      if (remaining > 0) chunks.push(Buffer.from(value.slice(0, remaining)));
      truncated = true;
      await reader.cancel();
      break;
    }
    chunks.push(Buffer.from(value));
  }

  return { text: Buffer.concat(chunks).toString('utf-8'), truncated };
}

function collapseWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function parseHtml(html: string): { title: string | null; extractedText: string } {
  const $ = load(html);
  $('script, style, nav, noscript, svg, iframe, form, [aria-hidden="true"]').remove();

  // <header>/<footer> are removed only when they are page-level chrome (not
  // nested inside <article>/<main>/[role="main"]). Blanket-removing every
  // <header>/<footer> in the document — the previous behavior — silently
  // deleted per-posting headers on any page using the common HTML5 pattern
  // `<article><header><h1>Job Title</h1><p>Company is hiring</p></header>...`,
  // which is exactly the text normalizeJobPosting's company/title extraction
  // looks for. That was the real cause of different real job-posting URLs
  // producing near-identical (MISSING_COMPANY_NAME-only) results.
  $('header, footer').each((_, el) => {
    const $el = $(el);
    if ($el.closest('article, main, [role="main"]').length === 0) {
      $el.remove();
    }
  });

  $('*')
    .contents()
    .each((_, node) => {
      if (node.type === 'comment') $(node).remove();
    });

  const title = collapseWhitespace($('title').first().text()) || null;
  const metaDescription = collapseWhitespace($('meta[name="description"]').attr('content') ?? '');
  const bodyText = collapseWhitespace($('body').text());

  const extractedText = [title, metaDescription, bodyText].filter(Boolean).join('\n\n');
  return { title, extractedText };
}

/**
 * Fetches a URL and extracts its readable text for analysis. Never throws —
 * every failure mode (invalid host, blocked/unreachable site, timeout,
 * non-HTML response, empty page) resolves with `metadata.success: false` and
 * a human-readable `metadata.error`, so a bad URL degrades the analysis
 * instead of failing it outright.
 */
export async function extractUrlContent(targetUrl: string): Promise<UrlExtractionResult> {
  try {
    const { response, finalUrl } = await safeFetch(
      targetUrl,
      env.URL_EXTRACTION_TIMEOUT_MS,
      MAX_REDIRECTS,
    );

    if (!response.ok) {
      return failure(
        targetUrl,
        `The page returned an error (HTTP ${response.status}).`,
        response.status,
      );
    }

    const contentType = response.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('application/xhtml')) {
      return failure(
        targetUrl,
        `The page is not readable HTML content (${contentType || 'unknown content type'}).`,
        response.status,
      );
    }

    const { text: html, truncated } = await readBodyCapped(response, env.URL_EXTRACTION_MAX_BYTES);
    const { title, extractedText } = parseHtml(html);

    if (!extractedText.trim()) {
      return failure(
        targetUrl,
        'The page loaded but contained no readable text content.',
        response.status,
      );
    }

    return {
      url: finalUrl,
      title,
      extractedText,
      metadata: { success: true, statusCode: response.status, contentType, truncated, error: null },
    };
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      return failure(targetUrl, 'The request timed out.');
    }
    const message = err instanceof Error ? err.message : 'Could not fetch the URL.';
    return failure(targetUrl, message);
  }
}
