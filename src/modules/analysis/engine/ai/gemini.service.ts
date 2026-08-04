import { env } from '@/config/env';
import { logger } from '@/shared/utils/logger';
import type { IGreenFlag, IRedFlag } from '@/modules/analysis/analysis.model';
import type { RiskLevel } from '@/shared/types/riskLevel';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

// Below this, a Gemini "not a job posting" verdict isn't trusted enough to
// block a real submission — an ambiguous low-confidence call should fall
// through to the rule engine rather than risk rejecting a real job posting.
const REJECTION_CONFIDENCE_THRESHOLD = 0.6;

// Prompt bodies are capped — this is context for classification/explanation,
// not something that needs the full text for very long postings, and it
// keeps prompt size (and therefore latency/cost) bounded.
const MAX_PROMPT_TEXT_LENGTH = 4000;

export function isGeminiConfigured(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

export interface GeminiValidationResult {
  isJobPosting: boolean;
  confidence: number;
  reason: string;
  extractedContext?: {
    jobTitle?: string;
    companyName?: string;
    hiringProcess?: string;
  };
}

export interface GeminiExplanationResult {
  explanation: string;
  recommendations: string[];
  observations: string[];
  confidence: number;
}

interface CallGeminiOptions {
  prompt: string;
  responseSchema: Record<string, unknown>;
}

/**
 * The single low-level entry point to the Gemini API. Never throws — every
 * failure mode (no API key, network error, timeout, non-2xx, quota, malformed
 * JSON) resolves to `null` so callers can fail open to rule-engine-only
 * behavior. Uses Gemini's structured-output mode (responseSchema) so the
 * model is constrained to valid JSON rather than relying on prompt-only
 * formatting instructions.
 */
async function callGemini({ prompt, responseSchema }: CallGeminiOptions): Promise<unknown | null> {
  if (!isGeminiConfigured()) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), env.GEMINI_TIMEOUT_MS);

  try {
    const res = await fetch(
      `${GEMINI_API_BASE}/${env.GEMINI_MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
      {
        method: 'POST',
        signal: controller.signal,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema,
            temperature: 0.2,
          },
        }),
      },
    );

    if (!res.ok) {
      // Dev-only: logs Google's own error description (e.g. "API key not
      // valid") to make misconfiguration diagnosable. Never logs the request
      // URL or the key itself — only the response body Google sent back.
      if (env.isDevelopment) {
        const errorBody = await res.text().catch(() => '<unreadable response body>');
        logger.warn({ status: res.status, errorBody }, 'Gemini API returned a non-OK response');
      } else {
        logger.warn({ status: res.status }, 'Gemini API returned a non-OK response');
      }
      return null;
    }

    const body = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const text = body.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) return null;

    return JSON.parse(text) as unknown;
  } catch (err) {
    logger.warn({ err }, 'Gemini API call failed');
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isValidationResult(value: unknown): value is GeminiValidationResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.isJobPosting === 'boolean' &&
    typeof v.confidence === 'number' &&
    typeof v.reason === 'string'
  );
}

/**
 * Validation layer (§8 of docs/ARCHITECTURE.md): classifies whether the
 * submitted text is actually a job posting/offer/recruitment message before
 * it reaches the rule engine. A scam job posting is still a job posting —
 * this only screens out content unrelated to jobs entirely (chit-chat,
 * technical questions, gibberish). Advisory only: returns null on any
 * failure so the caller can proceed without it.
 */
export async function validateJobPostingContent(
  rawText: string,
): Promise<GeminiValidationResult | null> {
  const prompt = `You are a content classifier for a job-scam detection tool called JobCheck.

Determine whether the text below is a job posting, job offer, or recruitment/hiring message — this includes legitimate job ads AND scam/fraudulent job ads (a scam job offer is still a job posting; being suspicious or scammy is NOT a reason to say it isn't a job posting — that judgment belongs to a separate system). Only mark it as NOT a job posting if it is clearly unrelated to jobs or recruitment entirely: casual conversation, technical questions, unrelated requests, or gibberish.

If it IS a job posting, optionally extract the job title, company name, and a short summary of the hiring process if mentioned.

Respond only with the JSON structure requested.

Text to classify:
"""
${rawText.slice(0, MAX_PROMPT_TEXT_LENGTH)}
"""`;

  const result = await callGemini({
    prompt,
    responseSchema: {
      type: 'object',
      properties: {
        isJobPosting: { type: 'boolean' },
        confidence: { type: 'number' },
        reason: { type: 'string' },
        extractedContext: {
          type: 'object',
          properties: {
            jobTitle: { type: 'string' },
            companyName: { type: 'string' },
            hiringProcess: { type: 'string' },
          },
        },
      },
      required: ['isJobPosting', 'confidence', 'reason'],
    },
  });

  return isValidationResult(result) ? result : null;
}

export function shouldRejectAsNonJobContent(result: GeminiValidationResult | null): boolean {
  return (
    result !== null && !result.isJobPosting && result.confidence >= REJECTION_CONFIDENCE_THRESHOLD
  );
}

function isExplanationResult(value: unknown): value is GeminiExplanationResult {
  if (typeof value !== 'object' || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.explanation === 'string' &&
    typeof v.confidence === 'number' &&
    (v.recommendations === undefined || Array.isArray(v.recommendations)) &&
    (v.observations === undefined || Array.isArray(v.observations))
  );
}

export interface ExplanationInput {
  rawText: string;
  riskScore: number;
  riskLevel: RiskLevel;
  redFlags: IRedFlag[];
  greenFlags: IGreenFlag[];
}

/**
 * Explanation layer (§8): runs AFTER the rule engine, given its already-
 * computed score/flags. Gemini's job here is narrow — explain the existing
 * verdict in plain language and suggest practical next steps. It is
 * explicitly instructed not to propose a different score. Advisory only:
 * returns null on any failure.
 */
export async function generateExplanation(
  input: ExplanationInput,
): Promise<GeminiExplanationResult | null> {
  const flagSummary = input.redFlags.length
    ? input.redFlags.map((f) => `- ${f.label} (${f.severity}): ${f.description}`).join('\n')
    : 'None detected.';

  const prompt = `You are an assistant for JobCheck, a tool that flags potentially fraudulent job postings using a deterministic rule engine. The rule engine has ALREADY computed the risk score below — your job is only to explain it in plain language and give practical advice. Do not propose a different score or contradict the rule engine's verdict.

Risk score: ${input.riskScore}/100 (${input.riskLevel})
Detected red flags:
${flagSummary}

Job posting text (for context only):
"""
${input.rawText.slice(0, MAX_PROMPT_TEXT_LENGTH)}
"""

Write:
- explanation: 2-4 sentences in plain language explaining why this posting received this risk level, referencing the flags above where relevant.
- recommendations: a short list of practical, actionable steps the reader should take.
- observations: any additional non-scoring observations about tone, phrasing, or missing information a job seeker should notice — informational only, do not invent new weighted red flags.
- confidence: your confidence (0 to 1) in the quality of this explanation.

Respond only with the JSON structure requested.`;

  const result = await callGemini({
    prompt,
    responseSchema: {
      type: 'object',
      properties: {
        explanation: { type: 'string' },
        recommendations: { type: 'array', items: { type: 'string' } },
        observations: { type: 'array', items: { type: 'string' } },
        confidence: { type: 'number' },
      },
      required: ['explanation', 'confidence'],
    },
  });

  return isExplanationResult(result) ? result : null;
}

/**
 * Folds recommendations + observations into the single `aiExplanation`
 * string the existing JobAnalysis schema already has a field for — no new
 * database fields needed (see docs/ARCHITECTURE.md §8).
 */
export function formatExplanationForStorage(result: GeminiExplanationResult): string {
  const sections = [result.explanation.trim()];

  if (result.recommendations.length) {
    sections.push(`Recommendations:\n${result.recommendations.map((r) => `- ${r}`).join('\n')}`);
  }
  if (result.observations.length) {
    sections.push(
      `Additional observations:\n${result.observations.map((o) => `- ${o}`).join('\n')}`,
    );
  }

  return sections.join('\n\n');
}
