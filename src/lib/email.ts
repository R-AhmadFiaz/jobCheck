import { Resend } from 'resend';
import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';

// Lazily constructed, cached on globalThis for the same reason db.ts's
// connection and rateLimit.ts's store are — avoids re-instantiating the
// client on every Next.js dev-mode module reload.
declare global {
  var __jobcheckResendClient: Resend | null | undefined;
}

function getClient(): Resend | null {
  if (!env.RESEND_API_KEY) return null;
  if (globalThis.__jobcheckResendClient === undefined) {
    globalThis.__jobcheckResendClient = new Resend(env.RESEND_API_KEY);
  }
  return globalThis.__jobcheckResendClient;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

/**
 * Sends an email via Resend. Server-side only (never import this from a
 * Client Component). Throws on any failure — not configured, or Resend
 * itself rejects the send — with the raw reason logged here first; callers
 * decide how to surface that safely (see contact.service.ts, which never
 * forwards this message to the client).
 */
export async function sendEmail(input: SendEmailInput): Promise<void> {
  const resend = getClient();
  if (!resend) {
    throw new Error('Email sending is not configured (RESEND_API_KEY is not set).');
  }

  const payload = {
    from: env.CONTACT_EMAIL_FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    replyTo: input.replyTo,
  };

  let { data, error } = await resend.emails.send(payload);

  // Resend's SDK reports its own outbound request failing to even reach
  // their servers (a DNS/network-level problem, confirmed independently of
  // this app) as error.name === 'application_error' — distinct from a real
  // rejection (bad key, unverified sender, quota exceeded, etc., which each
  // have their own specific error name and are never worth retrying). A
  // transient network blip is the one case worth one quick retry before
  // giving up.
  if (error?.name === 'application_error') {
    logger.warn({ err: error }, 'Resend send hit a network-level error — retrying once');
    await new Promise((resolve) => setTimeout(resolve, 500));
    ({ data, error } = await resend.emails.send(payload));
  }

  if (error) {
    logger.error({ err: error }, 'Resend email send failed');
    throw new Error(`Resend send failed: ${error.message}`);
  }

  logger.info({ emailId: data?.id }, 'Email sent via Resend');
}
