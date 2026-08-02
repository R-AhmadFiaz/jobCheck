export type ExtractedFieldName =
  'companyName' | 'jobTitle' | 'salaryRange' | 'contactEmail' | 'contactPhone' | 'location';

export type MatcherConfig =
  | { type: 'keyword'; keywords: string[]; recommendation: string }
  | { type: 'regex'; pattern: string; flags?: string; recommendation: string }
  | { type: 'emailDomain'; genericDomains: string[]; recommendation: string }
  | { type: 'fieldPresence'; requiredField: ExtractedFieldName; recommendation: string };

export type RuleSeverity = 'low' | 'medium' | 'high';

export interface ScamRule {
  _id: string;
  key: string;
  description: string;
  category: string;
  matcher: MatcherConfig;
  weight: number;
  severity: RuleSeverity;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedScamRules {
  items: ScamRule[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CreateScamRuleInput {
  key: string;
  description: string;
  category: string;
  severity: RuleSeverity;
  weight: number;
  matcher: MatcherConfig;
  isActive?: boolean;
}

export type UpdateScamRuleInput = Partial<Omit<CreateScamRuleInput, 'key'>>;
