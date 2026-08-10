import { env } from '@/config/env';
import { ApiError } from '@/shared/utils/ApiError';
import { logger } from '@/shared/utils/logger';
import { sendEmail } from '@/lib/email';
import type { ContactMessageInput } from '@/modules/contact/contact.validation';

// Minimal HTML-escaping for the handful of user-supplied fields interpolated
// into the notification email's HTML body below — the only place in this
// app that builds HTML from user input, so no existing sanitizer covers it.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// No database persistence: this app has no prior contact-form/message
// storage to preserve, and inventing one is out of scope for "add Resend
// email sending" — see the module's own directory (validation + service,
// no model) for the deliberate omission.
export async function submitContactMessage(input: ContactMessageInput): Promise<void> {
  if (!env.CONTACT_EMAIL_TO) {
    logger.error('Contact form submitted but CONTACT_EMAIL_TO is not configured');
    throw new ApiError(503, 'The contact form is not available right now. Please try again later.');
  }

  const submittedAt = new Date().toISOString();
  const html = `
    <h2>New contact message — JobCheck</h2>
    <p><strong>Name:</strong> ${escapeHtml(input.name)}</p>
    <p><strong>Email:</strong> ${escapeHtml(input.email)}</p>
    <p><strong>Submitted:</strong> ${submittedAt}</p>
    <p><strong>Message:</strong></p>
    <p>${escapeHtml(input.message).replace(/\n/g, '<br>')}</p>
  `.trim();

  const text = [
    'New contact message — JobCheck',
    `Name: ${input.name}`,
    `Email: ${input.email}`,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    input.message,
  ].join('\n');

  try {
    await sendEmail({
      to: env.CONTACT_EMAIL_TO,
      subject: `New contact message from ${input.name}`,
      html,
      text,
      replyTo: input.email,
    });
  } catch (err) {
    // The raw reason (Resend error, missing config) is logged inside
    // sendEmail() already — never forwarded past this point.
    logger.error({ err }, 'Failed to send contact notification email');
    throw new ApiError(502, 'Failed to send your message. Please try again later.');
  }
}
