import { z } from 'zod';

/**
 * Environment variables validation schema
 * Ensures all required env vars are present and valid at application startup
 */
const envSchema = z.object({
  VITE_SUPABASE_URL: z
    .string()
    .url('VITE_SUPABASE_URL must be a valid URL')
    .refine(
      (url) => url.includes('supabase.co'),
      'VITE_SUPABASE_URL must be a Supabase URL'
    ),
  VITE_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'VITE_SUPABASE_ANON_KEY is required')
    .refine(
      (key) => key.startsWith('eyJ'),
      'VITE_SUPABASE_ANON_KEY must be a valid JWT token'
    ),
  VITE_API_BASE_URL: z.string().url().optional(),
  VITE_DEV_PORT: z.string().optional(),
  VITE_DISABLE_HMR: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates and exports environment variables
 * @throws {ZodError} if validation fails
 */
function validateEnv(): Env {
  const result = envSchema.safeParse(import.meta.env);

  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    throw new Error(
      `Environment validation failed: ${result.error.errors
        .map((e) => `${e.path.join('.')}: ${e.message}`)
        .join(', ')}`
    );
  }

  return result.data;
}

/**
 * Validated environment variables
 * Safe to use throughout the application
 */
export const env = validateEnv();
