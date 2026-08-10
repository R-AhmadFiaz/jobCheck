import { getAIProvider } from '@/modules/analysis/ai/aiProviderFactory';
import { AIProviderError, type ChatMessage } from '@/modules/analysis/ai/interfaces/IAIProvider';
import { JOBCHECK_ASSISTANT_SYSTEM_PROMPT } from '@/modules/analysis/ai/prompts/chat.prompt';
import { ApiError } from '@/shared/utils/ApiError';
import { logger } from '@/shared/utils/logger';
import type { ChatRequestInput } from '@/modules/chat/chat.validation';

// No database persistence (by design, first version — see the task's own
// "session-only" decision): the client resends its own history each
// request, exactly like it already resends its own auth token — this
// service never stores a conversation anywhere.
export async function sendChatMessage(input: ChatRequestInput): Promise<string> {
  const provider = getAIProvider();
  if (!provider || !provider.isConfigured()) {
    logger.warn('Chat request received but no AI provider is configured (AI_ENABLED=false or missing GROQ_API_KEY)');
    throw new ApiError(503, 'The JobCheck Assistant is currently unavailable. Please try again later.');
  }

  const history: ChatMessage[] = [
    ...input.history.map((m) => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: input.message },
  ];

  try {
    const reply = await provider.chat(JOBCHECK_ASSISTANT_SYSTEM_PROMPT, history);
    return reply;
  } catch (err) {
    const code = err instanceof AIProviderError ? err.code : 'UNKNOWN';
    logger.error({ err, provider: provider.name, code }, 'Chat request to AI provider failed');
    throw new ApiError(502, 'The JobCheck Assistant could not respond right now. Please try again.');
  }
}
