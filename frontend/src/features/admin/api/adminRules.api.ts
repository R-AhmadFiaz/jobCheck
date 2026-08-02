import { apiRequest } from '@/lib/apiClient';
import type {
  CreateScamRuleInput,
  PaginatedScamRules,
  ScamRule,
  UpdateScamRuleInput,
} from '@/features/admin/types';

export interface ListRulesParams {
  isActive?: boolean;
  category?: string;
  severity?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function listScamRules(params: ListRulesParams = {}): Promise<PaginatedScamRules> {
  const query = new URLSearchParams();
  if (params.isActive !== undefined) query.set('isActive', String(params.isActive));
  if (params.category) query.set('category', params.category);
  if (params.severity) query.set('severity', params.severity);
  query.set('page', String(params.page ?? 1));
  query.set('limit', String(params.limit ?? 20));
  if (params.sortBy) query.set('sortBy', params.sortBy);
  if (params.sortOrder) query.set('sortOrder', params.sortOrder);
  return apiRequest<PaginatedScamRules>(`/admin/scam-rules?${query.toString()}`);
}

export async function createScamRule(input: CreateScamRuleInput): Promise<ScamRule> {
  const data = await apiRequest<{ rule: ScamRule }>('/admin/scam-rules', {
    method: 'POST',
    body: input,
  });
  return data.rule;
}

export async function updateScamRule(id: string, input: UpdateScamRuleInput): Promise<ScamRule> {
  const data = await apiRequest<{ rule: ScamRule }>(`/admin/scam-rules/${id}`, {
    method: 'PATCH',
    body: input,
  });
  return data.rule;
}

export async function deleteScamRule(id: string): Promise<void> {
  await apiRequest(`/admin/scam-rules/${id}`, { method: 'DELETE' });
}
