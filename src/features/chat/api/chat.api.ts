import { apiRequest } from '@/lib/apiClient';

export interface ChatHistoryMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatRequestInput {
  message: string;
  history: ChatHistoryMessage[];
}

// Thin client for the existing POST /api/v1/chat route — the Groq call and
// system prompt live entirely server-side (see src/modules/chat/*). Same
// apiRequest helper every other feature uses; no AI credentials or provider
// details on this side.
export function sendChatMessage(input: ChatRequestInput): Promise<{ reply: string }> {
  return apiRequest<{ reply: string }>('/chat', { method: 'POST', body: input });
}
