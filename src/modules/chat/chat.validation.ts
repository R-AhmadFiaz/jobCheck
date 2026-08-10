import { z } from 'zod';

// Bounds are deliberately tight enough that a maximal request comfortably
// fits inside readJsonBody.ts's existing DEFAULT_MAX_BYTES (10KB) body-size
// cap, which this route also goes through — these zod limits and that byte
// cap are two independent layers, not a substitute for one another. History
// is capped in COUNT (not just per-message length) specifically so a client
// can never send an unbounded, ever-growing conversation to Groq.
export const MAX_CHAT_MESSAGE_LENGTH = 1000;
export const MAX_CHAT_HISTORY_MESSAGES = 6;

const chatHistoryMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_LENGTH),
});

export const chatRequestSchema = z.object({
  message: z.string().trim().min(1, 'Message is required').max(MAX_CHAT_MESSAGE_LENGTH),
  // The prior turns of this session's conversation, sent back by the client
  // each request (see the "no server-side persistence" decision in
  // chat.service.ts) — optional so a first message needs none.
  history: z.array(chatHistoryMessageSchema).max(MAX_CHAT_HISTORY_MESSAGES).optional().default([]),
});

export type ChatRequestInput = z.infer<typeof chatRequestSchema>;
