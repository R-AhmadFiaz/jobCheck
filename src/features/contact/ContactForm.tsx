'use client';

import { useState, type FormEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Input, Textarea, Button, Alert, CheckCircleIcon } from '@/components/ui';
import { ApiClientError } from '@/lib/apiClient';
import { submitContactMessage } from '@/features/contact/api/contact.api';

interface FieldErrors {
  name?: string;
  email?: string;
  message?: string;
}

// Mirrors the shape of contact.validation.ts's zod bounds for immediate
// feedback only — the server remains the sole source of truth. Deliberately
// not a duplicate email regex claiming to be authoritative: it's the same
// permissive "looks like an email" shape any HTML `type="email"` input
// already checks, just enforced before a network round-trip.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(name: string, email: string, message: string): FieldErrors {
  const errors: FieldErrors = {};
  if (name.trim().length < 2) errors.name = 'Name must be at least 2 characters.';
  if (!EMAIL_PATTERN.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (message.trim().length < 10) errors.message = 'Message must be at least 10 characters.';
  return errors;
}

export function ContactForm() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: submitContactMessage,
    onSuccess: () => {
      // Reset only happens here, after the server has confirmed success —
      // never optimistically, so a failed request never shows a cleared
      // form next to a claimed success.
      setSubmitted(true);
      setName('');
      setEmail('');
      setMessage('');
    },
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (mutation.isPending) return;

    const errors = validate(name, email, message);
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setSubmitted(false);
    mutation.mutate({ name: name.trim(), email: email.trim(), message: message.trim() });
  };

  // ApiClientError's message is always the server's own sanitized text
  // (validation detail, rate-limit notice, or the generic "failed to send/
  // not available" fallback) — apiHandler.ts guarantees it never carries a
  // stack trace or provider detail, so it's always safe to show directly.
  const errorMessage =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.isError
        ? 'Something went wrong. Please try again.'
        : '';

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto text-center py-6" role="status">
        <div className="w-12 h-12 rounded-full bg-emerald-100 dark:bg-emerald-950 flex items-center justify-center mx-auto mb-4">
          <CheckCircleIcon size={24} className="text-emerald-600 dark:text-emerald-400" />
        </div>
        <h3 className="text-lg font-semibold text-[var(--foreground)]">Message sent</h3>
        <p className="mt-2 text-sm text-[var(--muted-foreground)]">
          Thanks for reaching out — we&apos;ll get back to you soon.
        </p>
        <Button variant="ghost" size="sm" className="mt-4" onClick={() => setSubmitted(false)}>
          Send another message
        </Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="max-w-xl mx-auto space-y-5">
      {errorMessage && (
        <div role="alert" aria-live="polite">
          <Alert variant="error" title="Could not send your message">
            {errorMessage}
          </Alert>
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="contact-name" className="text-sm font-medium text-[var(--foreground)]">
          Name
        </label>
        <Input
          id="contact-name"
          name="name"
          type="text"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={fieldErrors.name}
          aria-invalid={Boolean(fieldErrors.name)}
          placeholder="Jane Doe"
          disabled={mutation.isPending}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contact-email" className="text-sm font-medium text-[var(--foreground)]">
          Email
        </label>
        <Input
          id="contact-email"
          name="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldErrors.email}
          aria-invalid={Boolean(fieldErrors.email)}
          placeholder="you@example.com"
          disabled={mutation.isPending}
          required
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="contact-message" className="text-sm font-medium text-[var(--foreground)]">
          Message
        </label>
        <Textarea
          id="contact-message"
          name="message"
          rows={5}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          error={fieldErrors.message}
          aria-invalid={Boolean(fieldErrors.message)}
          placeholder="How can we help?"
          disabled={mutation.isPending}
          required
        />
      </div>

      <Button
        type="submit"
        loading={mutation.isPending}
        disabled={mutation.isPending}
        className="w-full"
      >
        Send message
      </Button>
    </form>
  );
}
