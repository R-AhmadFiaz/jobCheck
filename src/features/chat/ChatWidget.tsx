'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { useMutation } from '@tanstack/react-query';
import { MessageCircleIcon, XIcon, SendIcon, Spinner } from '@/components/ui';
import { ApiClientError } from '@/lib/apiClient';
import { sendChatMessage, type ChatHistoryMessage } from '@/features/chat/api/chat.api';

const WELCOME_MESSAGE =
  "Hi! I'm the JobCheck Assistant. Ask me about job scams, suspicious job postings, or how to stay safe while applying.";

// Mirrors chat.validation.ts's bounds — client-side UX hint only (native
// maxLength, and capping what's sent as history below); the server remains
// the sole authority, same deliberate split already used by the contact
// form's own client-side checks.
const MAX_MESSAGE_LENGTH = 1000;
// Must match chat.validation.ts's MAX_CHAT_HISTORY_MESSAGES — that schema
// caps assistant-role history entries at a higher length than user
// entries (AI replies are naturally longer than a typed question), which
// is what makes 4 the safe count rather than a larger one.
const MAX_HISTORY_TO_SEND = 4;

interface DisplayMessage extends ChatHistoryMessage {
  id: string;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `chat-msg-${idCounter}`;
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (result) => {
      setMessages((prev) => [...prev, { id: nextId(), role: 'assistant', content: result.reply }]);
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, mutation.isPending]);

  // ApiClientError's message is always the server's own sanitized text
  // (validation detail, rate-limit notice, or the generic "unavailable"/
  // "could not respond" fallback) — apiHandler.ts guarantees it never
  // carries a stack trace or provider detail, so it's always safe to show.
  const errorMessage =
    mutation.error instanceof ApiClientError
      ? mutation.error.message
      : mutation.isError
        ? 'Something went wrong. Please try again.'
        : '';

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed || mutation.isPending) return;

    // Full session history stays visible in the panel; only a bounded
    // recent window is sent as context, matching the server's own
    // MAX_CHAT_HISTORY_MESSAGES cap — this is what keeps a long session
    // from growing into an unbounded request to Groq.
    const history = messages
      .slice(-MAX_HISTORY_TO_SEND)
      .map(({ role, content }): ChatHistoryMessage => ({ role, content }));

    setMessages((prev) => [...prev, { id: nextId(), role: 'user', content: trimmed }]);
    setInput('');
    mutation.mutate({ message: trimmed, history });
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open JobCheck Assistant chat"
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-[var(--primary)] text-white shadow-lg hover:brightness-110 hover:shadow-xl transition-all flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        <MessageCircleIcon size={24} />
      </button>
    );
  }

  return (
    <div
      role="dialog"
      aria-label="JobCheck Assistant chat"
      className="fixed bottom-6 right-6 z-40 w-[360px] max-w-[calc(100vw-2rem)] h-[520px] max-h-[calc(100vh-3rem)] bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-2xl flex flex-col overflow-hidden"
    >
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-[var(--border)] bg-[var(--primary)] text-white flex-shrink-0">
        <div className="flex items-center gap-2">
          <MessageCircleIcon size={18} />
          <span className="font-semibold text-sm">JobCheck Assistant</span>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close chat"
          className="p-1 rounded-lg hover:bg-white/20 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
        >
          <XIcon size={18} />
        </button>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <div className="max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm bg-[var(--muted)] text-[var(--foreground)]">
          {WELCOME_MESSAGE}
        </div>

        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
              m.role === 'user'
                ? 'ml-auto bg-[var(--primary)] text-white'
                : 'bg-[var(--muted)] text-[var(--foreground)]'
            }`}
          >
            {m.content}
          </div>
        ))}

        {mutation.isPending && (
          <div
            className="flex items-center gap-2 bg-[var(--muted)] text-[var(--muted-foreground)] rounded-2xl px-3.5 py-2.5 text-sm w-fit"
            aria-live="polite"
          >
            <Spinner size={14} />
            Thinking…
          </div>
        )}

        {errorMessage && (
          <div role="alert" className="text-xs text-[var(--danger)] px-1">
            {errorMessage}
          </div>
        )}
      </div>

      <div className="border-t border-[var(--border)] p-3 flex items-center gap-2 flex-shrink-0">
        <label htmlFor="chat-input" className="sr-only">
          Message the JobCheck Assistant
        </label>
        <input
          id="chat-input"
          type="text"
          autoComplete="off"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about a job posting…"
          maxLength={MAX_MESSAGE_LENGTH}
          disabled={mutation.isPending}
          className="flex-1 bg-[var(--muted)] rounded-xl px-3.5 py-2 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] outline-none disabled:opacity-60"
        />
        <button
          type="button"
          onClick={handleSend}
          disabled={mutation.isPending || !input.trim()}
          aria-label="Send message"
          className="p-2.5 rounded-xl bg-[var(--primary)] text-white disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-110 transition-all flex-shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <SendIcon size={16} />
        </button>
      </div>
    </div>
  );
}
