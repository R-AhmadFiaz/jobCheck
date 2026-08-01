import { ScamRule, type IScamRule } from '@/modules/analysis/engine/scamRule.model';
import type {
  CreateScamRuleInput,
  UpdateScamRuleInput,
  ListScamRulesQuery,
} from '@/modules/admin/admin.validation';
import { ApiError } from '@/shared/utils/ApiError';

export interface PaginatedScamRules {
  items: IScamRule[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === 'object' && err !== null && (err as { code?: number }).code === 11000;
}

export async function listScamRules(query: ListScamRulesQuery): Promise<PaginatedScamRules> {
  const filter: Record<string, unknown> = {};
  if (query.isActive !== undefined) filter.isActive = query.isActive;
  if (query.category) filter.category = query.category;
  if (query.severity) filter.severity = query.severity;

  const skip = (query.page - 1) * query.limit;
  const sort: Record<string, 1 | -1> = { [query.sortBy]: query.sortOrder === 'asc' ? 1 : -1 };

  const [items, total] = await Promise.all([
    ScamRule.find(filter).sort(sort).skip(skip).limit(query.limit),
    ScamRule.countDocuments(filter),
  ]);

  return {
    items,
    page: query.page,
    limit: query.limit,
    total,
    totalPages: Math.ceil(total / query.limit),
  };
}

export async function createScamRule(input: CreateScamRuleInput): Promise<IScamRule> {
  const normalizedKey = input.key.trim().toUpperCase();

  try {
    return await ScamRule.create({ ...input, key: normalizedKey });
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new ApiError(409, `A rule with key "${normalizedKey}" already exists`);
    }
    throw err;
  }
}

export async function updateScamRule(id: string, input: UpdateScamRuleInput): Promise<IScamRule> {
  const rule = await ScamRule.findById(id);
  if (!rule) {
    throw new ApiError(404, 'Scam rule not found');
  }

  Object.assign(rule, input);
  await rule.save();
  return rule;
}

export async function deleteScamRule(id: string): Promise<void> {
  const deleted = await ScamRule.findByIdAndDelete(id);
  if (!deleted) {
    throw new ApiError(404, 'Scam rule not found');
  }
}
