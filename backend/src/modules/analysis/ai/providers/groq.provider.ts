import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import {
  AIProviderError,
  type AIProviderAnalysisInput,
  type AIProviderAnalysisResult,
  type IAIProvider,
} from '@/modules/analysis/ai/interfaces/IAIProvider';
import { JOB_ANALYSIS_SYSTEM_PROMPT, buildJobAnalysisPrompt } from '@/modules/analysis/ai/prompts/jobAnalysis.prompt';
import { DOCUMENT_TYPES, isEmploymentDocumentType, type DocumentType } from '@/modules/analysis/ai/documentClassification';

// Groq's OpenAI-compatible chat-completions endpoint — called via native
// fetch rather than the groq-sdk/openai packages, matching the precedent
// already set by engine/ai/gemini.service.ts (no new dependency needed for
// a single JSON-in/JSON-out REST call).
const GROQ_API_BASE = 'https://api.groq.com/openai/v1/chat/completions';

interface GroqChatCompletionResponse {
  choices?: { message?: { content?: string } }[];
}

// What we actually ask the model for (see jobAnalysis.prompt.ts) — narrower
// than AIProviderAnalysisResult on purpose: isJobPosting/confidence are
// derived below, never requested from the model directly, so they can never
// contradict its own documentType classification.
interface RawClassificationResponse {
  documentType: DocumentType;
  documentTypeConfidence: number;
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

function isRawClassificationShape(value: unknown): value is RawClassificationResponse {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.documentType === 'string' &&
    DOCUMENT_TYPES.includes(v.documentType as DocumentType) &&
    typeof v.documentTypeConfidence === 'number' &&
    v.documentTypeConfidence >= 0 &&
    v.documentTypeConfidence <= 1 &&
    typeof v.summary === 'string' &&
    Array.isArray(v.redFlags) &&
    Array.isArray(v.recommendations)
  );
}

/**
 * Groq implementation of IAIProvider. Isolated inside this AI module —
 * nothing outside modules/analysis/ai/ should import this class directly
 * (and, per this phase's scope, nothing does yet: analysis.service.ts and
 * every controller are untouched).
 */
export class GroqProvider implements IAIProvider {
  readonly name = 'groq';

  isConfigured(): boolean {
    return Boolean(env.GROQ_API_KEY);
  }

  async analyzeJobContent(input: AIProviderAnalysisInput): Promise<AIProviderAnalysisResult> {
    if (!this.isConfigured()) {
      throw new AIProviderError('MISSING_API_KEY', 'GROQ_API_KEY is not configured.');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), env.GROQ_TIMEOUT_MS);

    let response: Response;
    try {
      response = await fetch(GROQ_API_BASE, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${env.GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: env.GROQ_MODEL,
          temperature: 0.2,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: JOB_ANALYSIS_SYSTEM_PROMPT },
            { role: 'user', content: buildJobAnalysisPrompt({ rawText: input.rawText }) },
          ],
        }),
      });
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        throw new AIProviderError(
          'TIMEOUT',
          `Groq API request timed out after ${env.GROQ_TIMEOUT_MS}ms.`,
          err,
        );
      }
      throw new AIProviderError('REQUEST_FAILED', 'Groq API request failed.', err);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      // Dev-only: logs Groq's own error body to make misconfiguration
      // diagnosable, never the request URL (which carries the key via the
      // Authorization header, not the URL itself, but kept consistent with
      // the same never-log-secrets discipline as gemini.service.ts).
      const errorBody = env.isDevelopment
        ? await response.text().catch(() => '<unreadable response body>')
        : undefined;
      logger.warn(
        { status: response.status, provider: this.name, errorBody },
        'AI provider returned a non-OK response',
      );
      throw new AIProviderError('REQUEST_FAILED', `Groq API returned status ${response.status}.`);
    }

    let body: GroqChatCompletionResponse;
    try {
      body = (await response.json()) as GroqChatCompletionResponse;
    } catch (err) {
      throw new AIProviderError('INVALID_RESPONSE', 'Groq API response was not valid JSON.', err);
    }

    const text = body.choices?.[0]?.message?.content;
    if (!text) {
      throw new AIProviderError('INVALID_RESPONSE', 'Groq API response did not contain any content.');
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch (err) {
      throw new AIProviderError('INVALID_RESPONSE', 'Groq API content was not valid JSON.', err);
    }

    if (!isRawClassificationShape(parsed)) {
      throw new AIProviderError(
        'INVALID_RESPONSE',
        'Groq API response did not match the expected classification shape.',
      );
    }

    // isJobPosting/confidence are derived here, deterministically, from the
    // model's own classification — never requested from the model as
    // separate fields, so they can never disagree with documentType.
    return {
      documentType: parsed.documentType,
      documentTypeConfidence: parsed.documentTypeConfidence,
      isJobPosting: isEmploymentDocumentType(parsed.documentType),
      confidence: parsed.documentTypeConfidence,
      summary: parsed.summary,
      redFlags: parsed.redFlags,
      recommendations: parsed.recommendations,
    };
  }
}
