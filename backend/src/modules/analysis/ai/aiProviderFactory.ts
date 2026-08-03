import { env } from '@/config/env';
import type { IAIProvider } from '@/modules/analysis/ai/interfaces/IAIProvider';
import { GroqProvider } from '@/modules/analysis/ai/providers/groq.provider';

// The ONLY file in this module allowed to know which concrete class backs
// IAIProvider today. analysis.service.ts (and everything else outside this
// ai/ folder) must only ever import getAIProvider() plus the IAIProvider
// type — never GroqProvider itself — so swapping Groq for Gemini/OpenAI/
// Claude later means changing only this one file.
let cachedProvider: IAIProvider | null = null;

/**
 * Returns the configured AI provider, or null if AI is disabled entirely
 * (AI_ENABLED=false, the default) or no provider is available. Callers
 * must still call `.isConfigured()` on the result before using it — a
 * returned provider instance existing does not by itself mean it has a
 * usable API key.
 */
export function getAIProvider(): IAIProvider | null {
  if (!env.AI_ENABLED) return null;
  cachedProvider ??= new GroqProvider();
  return cachedProvider;
}
