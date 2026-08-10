import type { RiskLevel } from '@/shared/types/riskLevel';
import type { DocumentType } from '@/modules/analysis/ai/documentClassification';

// Provider-independent AI seam (architecture-only — not wired into
// analysis.service.ts yet). The goal of this interface is that swapping
// Groq for Gemini/OpenAI/Claude later means writing a new class in
// providers/ that implements IAIProvider — nothing in the analysis
// pipeline, once it eventually calls this, should need to change.
//
// Deliberately a single, unified "analyze this text" call rather than
// mirroring the existing engine/ai/gemini.service.ts's two separate calls
// (pre-score validation, post-score explanation) — this seam represents
// what a future primary AI analysis capability should look like, not
// today's advisory Gemini layer.

export interface AIProviderAnalysisInput {
  rawText: string;
  // Optional context the deterministic rule engine may have already
  // computed. Entirely optional so this interface stays usable even before
  // (or without) the rule engine ever running.
  riskScore?: number;
  riskLevel?: RiskLevel;
}

export interface AIProviderAnalysisResult {
  // Phase 8: the AI's FIRST responsibility, ahead of any scam-risk opinion.
  // Only JOB_POSTING/INTERNSHIP_POSTING represent an actual recruitment
  // opportunity — see documentClassification.ts, which owns the full type
  // vocabulary and the decision of whether this should block analysis.
  documentType: DocumentType;
  // 0..1
  documentTypeConfidence: number;
  // Kept for backward compatibility with code written before Phase 8
  // (e.g. aiResultMerger.ts's existing gating) — providers MUST derive
  // these deterministically from documentType/documentTypeConfidence
  // (isJobPosting = documentType is JOB_POSTING or INTERNSHIP_POSTING;
  // confidence = documentTypeConfidence) rather than asking the model to
  // produce a second, independently-generated pair of numbers that could
  // contradict the classification above.
  isJobPosting: boolean;
  confidence: number;
  summary: string;
  redFlags: string[];
  recommendations: string[];
}

// A single turn in a free-form conversation — the JobCheck Assistant
// chatbot (modules/chat/), a second, independent capability alongside
// analyzeJobContent() below. Deliberately just role+content: no id/
// timestamp/metadata, since the provider only needs enough to build a
// chat-completions request, nothing more.
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface IAIProvider {
  // Short, stable identifier for logging/observability (e.g. "groq").
  readonly name: string;

  // Cheap, synchronous check — no network call — so a caller can decide
  // whether to even attempt analyzeJobContent()/chat(). Mirrors the
  // existing isGeminiConfigured() convention.
  isConfigured(): boolean;

  // Throws an AIProviderError (see below) on any failure — this interface
  // does not fail open on its own. Whether a future caller catches that
  // error and degrades gracefully is a pipeline-level policy decision, not
  // this seam's responsibility.
  analyzeJobContent(input: AIProviderAnalysisInput): Promise<AIProviderAnalysisResult>;

  // Free-form conversational completion for the chatbot — unlike
  // analyzeJobContent(), returns plain text, not a structured/JSON result.
  // `systemPrompt` is passed in by the caller (modules/chat/) rather than
  // hardcoded here, so this method stays a pure "talk to the model" seam,
  // consistent with analyzeJobContent() also taking its content from the
  // caller rather than embedding job-analysis-specific text itself.
  chat(systemPrompt: string, history: readonly ChatMessage[]): Promise<string>;
}

export type AIProviderErrorCode = 'MISSING_API_KEY' | 'TIMEOUT' | 'INVALID_RESPONSE' | 'REQUEST_FAILED';

// The one error shape every IAIProvider implementation is expected to
// throw, so a future caller can branch on `error.code` the same way
// regardless of which provider is actually configured.
export class AIProviderError extends Error {
  readonly code: AIProviderErrorCode;

  constructor(code: AIProviderErrorCode, message: string, cause?: unknown) {
    // `cause` is passed through to the built-in Error option (ES2022,
    // matches this project's compile target) rather than a custom field —
    // Error already declares an optional `cause` property, so redeclaring
    // it here would conflict with the base class's type.
    super(message, { cause });
    this.name = 'AIProviderError';
    this.code = code;
  }
}
