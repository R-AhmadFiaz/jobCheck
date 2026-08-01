import { z } from 'zod';

// Mirrors the matcher shapes ruleEngine.ts understands (Phase 4). Keep these in
// sync with that file's MatcherConfig union — a shape the engine can't recognize
// simply never fires, so validating it here is what "preserve data integrity" means.
const recommendationField = z.string().trim().min(1).max(1000);

const keywordMatcherSchema = z.object({
  type: z.literal('keyword'),
  keywords: z.array(z.string().trim().min(1)).min(1),
  recommendation: recommendationField,
});

const regexMatcherSchema = z.object({
  type: z.literal('regex'),
  pattern: z.string().min(1),
  flags: z.string().max(10).optional(),
  recommendation: recommendationField,
});

const emailDomainMatcherSchema = z.object({
  type: z.literal('emailDomain'),
  genericDomains: z.array(z.string().trim().toLowerCase().min(1)).min(1),
  recommendation: recommendationField,
});

const fieldPresenceMatcherSchema = z.object({
  type: z.literal('fieldPresence'),
  requiredField: z.enum([
    'companyName',
    'jobTitle',
    'salaryRange',
    'contactEmail',
    'contactPhone',
    'location',
  ]),
  recommendation: recommendationField,
});

export const matcherSchema = z
  .discriminatedUnion('type', [
    keywordMatcherSchema,
    regexMatcherSchema,
    emailDomainMatcherSchema,
    fieldPresenceMatcherSchema,
  ])
  .refine(
    (data) => {
      if (data.type !== 'regex') return true;
      try {
        new RegExp(data.pattern, data.flags ?? 'i');
        return true;
      } catch {
        return false;
      }
    },
    { message: 'matcher.pattern is not a valid regular expression' },
  );

const severitySchema = z.enum(['low', 'medium', 'high']);

export const createScamRuleSchema = z.object({
  key: z.string().trim().min(2).max(100),
  description: z.string().trim().min(5).max(1000),
  category: z.string().trim().min(2).max(50).toLowerCase(),
  severity: severitySchema,
  weight: z.number().min(0).max(100),
  matcher: matcherSchema,
  isActive: z.boolean().optional().default(true),
});

export const updateScamRuleSchema = z
  .object({
    description: z.string().trim().min(5).max(1000).optional(),
    category: z.string().trim().min(2).max(50).toLowerCase().optional(),
    severity: severitySchema.optional(),
    weight: z.number().min(0).max(100).optional(),
    matcher: matcherSchema.optional(),
    isActive: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export const listScamRulesQuerySchema = z.object({
  isActive: z
    .enum(['true', 'false'])
    .optional()
    .transform((value) => (value === undefined ? undefined : value === 'true')),
  category: z.string().trim().toLowerCase().optional(),
  severity: severitySchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z
    .enum(['createdAt', 'updatedAt', 'weight', 'key', 'category', 'severity'])
    .default('createdAt'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const scamRuleIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid scam rule id'),
});

export type CreateScamRuleInput = z.infer<typeof createScamRuleSchema>;
export type UpdateScamRuleInput = z.infer<typeof updateScamRuleSchema>;
export type ListScamRulesQuery = z.infer<typeof listScamRulesQuerySchema>;
