import { z } from 'zod';

// Bounds are deliberately tight enough that a maximal request comfortably
// fits inside readJsonBody.ts's existing DEFAULT_MAX_BYTES (10KB) body-size
// cap, which this route also goes through — these zod limits and that byte
// cap are two independent layers, not a substitute for one another. History
// is capped in COUNT (not just per-message length) specifically so a client
// can never send an unbounded, ever-growing conversation to Groq.
export const MAX_CHAT_MESSAGE_LENGTH = 1000;

// AI-generated replies are naturally longer than a typed question — a
// thorough, multi-point answer routinely exceeds 1000 characters. This cap
// applies ONLY to assistant-role history entries (what the model itself
// said on a previous turn, echoed back for context); the live `message`
// field and user-role history entries stay bounded by
// MAX_CHAT_MESSAGE_LENGTH above, since nothing about a typed question
// needs to be this long.
export const MAX_CHAT_ASSISTANT_HISTORY_LENGTH = 2000;

// 2 full exchanges (user+assistant, user+assistant) — enough context for a
// natural follow-up without letting a long session's history grow
// unbounded. Worst case with the bounds above: 2×1000 (user) + 2×2000
// (assistant) + 1000 (the new message) = 7000 characters of actual
// content — comfortably inside the 10KB body cap even with JSON
// structural overhead. Keep ChatWidget.tsx's MAX_HISTORY_TO_SEND in sync
// with this value — it slices the client's session history down to the
// same count before sending.
export const MAX_CHAT_HISTORY_MESSAGES = 4;

// Same shape-per-role pattern already used by admin.validation.ts's
// matcherSchema — a plain z.object() can't express "content has a
// different max length depending on role", a discriminated union can.
const chatHistoryMessageSchema = z.discriminatedUnion('role', [
  z.object({
    role: z.literal('user'),
    content: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
  }),
  z.object({
    role: z.literal('assistant'),
    content: z.string().trim().min(1).max(MAX_CHAT_ASSISTANT_HISTORY_LENGTH),
  }),
]);

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(MAX_CHAT_MESSAGE_LENGTH),
  // The prior turns of this session's conversation, sent back by the client
  // each request (see the "no server-side persistence" decision in
  // chat.service.ts) — optional so a first message needs none.
  history: z.array(chatHistoryMessageSchema).max(MAX_CHAT_HISTORY_MESSAGES).optional().default([]),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
