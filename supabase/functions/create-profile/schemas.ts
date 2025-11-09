import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

/**
 * Schema de validation pour la requête de création de profil
 * Utilisé par la fonction create-profile (appelée via Auth Hooks)
 */
export const CreateProfileRequestSchema = z.object({
  id: z.string().uuid({
    message: 'ID must be a valid UUID',
  }),
  email: z.string().email({
    message: 'Email must be a valid email address',
  }),
  first_name: z.string().min(1, {
    message: 'First name cannot be empty',
  }).optional(),
  last_name: z.string().min(1, {
    message: 'Last name cannot be empty',
  }).optional(),
}).strict(); // Rejette les champs inconnus

// Type TypeScript inféré du schéma
export type CreateProfileRequest = z.infer<typeof CreateProfileRequestSchema>;
