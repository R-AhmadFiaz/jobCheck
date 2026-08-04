import type { ZodSchema } from 'zod';
import { ApiError } from '@/shared/utils/ApiError';

// Next.js migration: replaces validate.middleware.ts's Express middleware
// factory with a plain function called explicitly at the top of each Route
// Handler. Same Zod schemas, same error-message format, same ApiError(400,
// ...) — only the invocation mechanism changes (no req/res/next).
export function validateData<T>(schema: ZodSchema<T>, data: unknown): T {
  const result = schema.safeParse(data);

  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
      .join('; ');
    throw new ApiError(400, message || 'Invalid request payload');
  }

  return result.data;
}
