import { z } from 'npm:zod';

const envSchema = z.object({
  SUPABASE_URL: z.string().url('SUPABASE_URL doit être une URL Supabase valide'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'SUPABASE_SERVICE_ROLE_KEY est requis'),
  EDGE_WEBHOOK_SECRET: z.string().min(1, 'EDGE_WEBHOOK_SECRET est requis'),
  ALLOWED_ORIGIN: z
    .string()
    .url('ALLOWED_ORIGIN doit être une URL valide')
    .optional()
    .default('http://localhost:5173'),
  IMPORTS_BUCKET: z.string().min(1, 'IMPORTS_BUCKET est requis').default('imports'),
  CIR_DATASET_CLASSIFICATION: z
    .string()
    .min(1, 'CIR_DATASET_CLASSIFICATION est requis')
    .default('cir_classification'),
  CIR_DATASET_SEGMENT: z
    .string()
    .min(1, 'CIR_DATASET_SEGMENT est requis')
    .default('cir_segment')
});

type EnvSchema = z.infer<typeof envSchema>;

function loadEnv(): EnvSchema {
  const raw: Record<keyof EnvSchema, string | undefined> = {
    SUPABASE_URL: Deno.env.get('SUPABASE_URL') ?? undefined,
    SUPABASE_SERVICE_ROLE_KEY: Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? undefined,
    EDGE_WEBHOOK_SECRET: Deno.env.get('EDGE_WEBHOOK_SECRET') ?? undefined,
    ALLOWED_ORIGIN: Deno.env.get('ALLOWED_ORIGIN') ?? undefined,
    IMPORTS_BUCKET: Deno.env.get('IMPORTS_BUCKET') ?? undefined,
    CIR_DATASET_CLASSIFICATION: Deno.env.get('CIR_DATASET_CLASSIFICATION') ?? undefined,
    CIR_DATASET_SEGMENT: Deno.env.get('CIR_DATASET_SEGMENT') ?? undefined
  };

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    console.error('[env] Invalid Edge Function environment');
    console.error(parsed.error.format());
    throw new Error(
      parsed.error.issues
        .map((issue) => `${issue.path.join('.') || 'env'}: ${issue.message}`)
        .join(', ')
    );
  }

  return parsed.data;
}

export const env = loadEnv();

export const CIR_DATASETS = {
  classification: env.CIR_DATASET_CLASSIFICATION,
  segment: env.CIR_DATASET_SEGMENT
} as const;

export type CirDatasetSlug = typeof CIR_DATASETS[keyof typeof CIR_DATASETS];
