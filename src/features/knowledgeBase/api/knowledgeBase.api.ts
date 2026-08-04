import { apiRequest } from '@/lib/apiClient';
import type { KnowledgeEntryType, KnowledgeSearchResult } from '@/features/knowledgeBase/types';

export async function searchKnowledgeBase(
  type: KnowledgeEntryType,
  query: string,
): Promise<KnowledgeSearchResult> {
  const params = new URLSearchParams({ type });
  if (query.trim()) {
    params.set('q', query.trim());
  }

  return apiRequest<KnowledgeSearchResult>(`/knowledge-base/search?${params.toString()}`);
}
