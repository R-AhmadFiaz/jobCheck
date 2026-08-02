import { apiRequest, ApiClientError } from '@/lib/apiClient';
import { env } from '@/config/env';
import type {
  AnalysisHistoryResult,
  AnalysisWithStatus,
  PublicReport,
} from '@/features/analysis/types';

// Must not exceed the backend's listAnalysesQuerySchema max (analysis.validation.ts) —
// requesting more than that returns a 400, which callers sampling for client-side
// stats (Dashboard/Profile) would otherwise see as an empty result, not an error.
export const MAX_HISTORY_PAGE_SIZE = 50;

export function createAnalysis(input: {
  jobText?: string;
  jobUrl?: string;
}): Promise<AnalysisWithStatus> {
  return apiRequest<AnalysisWithStatus>('/analyses', { method: 'POST', body: input });
}

// Anonymous/guest path (POST /analyze/public) — multipart, not JSON, so this
// bypasses apiRequest (which always JSON-stringifies) rather than bending that
// helper to support two body encodings.
export async function createPublicAnalysis(input: {
  jobText?: string;
  jobUrl?: string;
  file?: File;
}): Promise<AnalysisWithStatus> {
  const formData = new FormData();
  if (input.jobUrl) formData.append('url', input.jobUrl);
  if (input.jobText) formData.append('description', input.jobText);
  if (input.file) formData.append('file', input.file);

  let res: Response;
  try {
    res = await fetch(`${env.apiBaseUrl}/analyze/public`, { method: 'POST', body: formData });
  } catch {
    throw new ApiClientError(
      0,
      `Could not reach the API at ${env.apiBaseUrl}. This is usually a CORS mismatch or the backend not running.`,
    );
  }

  const body = (await res.json().catch(() => null)) as {
    success: boolean;
    data?: AnalysisWithStatus;
    error?: { message: string };
  } | null;

  if (!res.ok || !body?.success) {
    throw new ApiClientError(res.status, body?.error?.message ?? `Request failed (${res.status})`);
  }

  return body.data as AnalysisWithStatus;
}

export function getAnalysisById(id: string): Promise<AnalysisWithStatus> {
  return apiRequest<AnalysisWithStatus>(`/analyses/${id}`);
}

export function getAnalysisHistory(page = 1, limit = 20): Promise<AnalysisHistoryResult> {
  return apiRequest<AnalysisHistoryResult>(`/analyses?page=${page}&limit=${limit}`);
}

// "Share Report" link target — fully public, no auth required, works for any
// analysis id (guest or an authenticated user's own).
export function getPublicReport(id: string): Promise<{ report: PublicReport }> {
  return apiRequest<{ report: PublicReport }>(`/reports/${id}`);
}
