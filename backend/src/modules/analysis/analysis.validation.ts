import { z } from 'zod';

export const createAnalysisSchema = z
  .object({
    jobText: z
      .string()
      .trim()
      .min(20, 'Job description must be at least 20 characters')
      .max(20000)
      .optional(),
    jobUrl: z.string().trim().url('Invalid URL').max(2048).optional(),
  })
  .refine((data) => Number(Boolean(data.jobText)) + Number(Boolean(data.jobUrl)) === 1, {
    message: 'Provide exactly one of jobText or jobUrl',
  });

export const listAnalysesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

export const analysisIdParamSchema = z.object({
  id: z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid analysis id'),
});

// multipart/form-data always sends text fields as strings, including an empty
// string for an untouched form field — normalized to undefined so "" doesn't
// count as a provided source.
const optionalFormField = (schema: z.ZodType<string>) =>
  z
    .union([schema, z.literal('')])
    .optional()
    .transform((value) => (value ? value : undefined));

const publicUrlSchema = z
  .string()
  .trim()
  .url('Invalid URL')
  .max(2048)
  .refine((value) => /^https?:\/\//i.test(value), {
    message: 'Only http:// and https:// URLs are supported',
  });

export const publicAnalysisBodySchema = z.object({
  url: optionalFormField(publicUrlSchema),
  description: optionalFormField(z.string().trim().max(20000)),
});

export type CreateAnalysisInput = z.infer<typeof createAnalysisSchema>;
export type ListAnalysesQuery = z.infer<typeof listAnalysesQuerySchema>;
export type PublicAnalysisBody = z.infer<typeof publicAnalysisBodySchema>;
