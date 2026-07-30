import { z } from 'zod';

const envSchema = z.object({
  VITE_API_BASE_URL: z.string().min(1, 'VITE_API_BASE_URL is required'),
});

const parsed = envSchema.safeParse(import.meta.env);

if (!parsed.success) {
  throw new Error(
    `Invalid frontend environment configuration: ${JSON.stringify(parsed.error.flatten().fieldErrors)}`,
  );
}

export const env = {
  apiBaseUrl: parsed.data.VITE_API_BASE_URL,
};
