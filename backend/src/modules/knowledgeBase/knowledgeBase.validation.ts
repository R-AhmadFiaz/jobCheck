import { z } from 'zod';

const knowledgeEntryTypeSchema = z.enum(['company', 'recruiter', 'domain']);
const knowledgeRiskLevelSchema = z.enum(['safe', 'suspicious', 'high_risk', 'confirmed_scam']);
const verificationStatusSchema = z.enum(['unverified', 'community_verified', 'admin_verified']);

export const searchKnowledgeQuerySchema = z.object({
  type: knowledgeEntryTypeSchema,
  q: z.string().trim().max(200).optional().default(''),
});

export const listKnowledgeQuerySchema = z.object({
  type: knowledgeEntryTypeSchema.optional(),
  riskLevel: knowledgeRiskLevelSchema.optional(),
  verificationStatus: verificationStatusSchema.optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const knowledgeEntryIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid knowledge base entry id'),
});

export const createKnowledgeEntrySchema = z.object({
  type: knowledgeEntryTypeSchema,
  name: z.string().trim().min(2).max(200),
  description: z.string().trim().min(5).max(2000),
  trustScore: z.coerce.number().min(0).max(100),
  riskLevel: knowledgeRiskLevelSchema,
  indicators: z.array(z.string().trim().min(1).max(200)).default([]),
  verificationStatus: verificationStatusSchema.default('unverified'),
  domain: z.string().trim().max(255).optional(),
  associatedCompany: z.string().trim().max(200).optional(),
});

export const updateKnowledgeEntrySchema = z
  .object({
    description: z.string().trim().min(5).max(2000).optional(),
    trustScore: z.coerce.number().min(0).max(100).optional(),
    riskLevel: knowledgeRiskLevelSchema.optional(),
    indicators: z.array(z.string().trim().min(1).max(200)).optional(),
    verificationStatus: verificationStatusSchema.optional(),
    domain: z.string().trim().max(255).optional(),
    associatedCompany: z.string().trim().max(200).optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided to update',
  });

export type SearchKnowledgeQuery = z.infer<typeof searchKnowledgeQuerySchema>;
export type ListKnowledgeQuery = z.infer<typeof listKnowledgeQuerySchema>;
export type CreateKnowledgeEntryInput = z.infer<typeof createKnowledgeEntrySchema>;
export type UpdateKnowledgeEntryInput = z.infer<typeof updateKnowledgeEntrySchema>;
