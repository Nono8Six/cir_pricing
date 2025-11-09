import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CreateProfileRequestSchema } from './schemas.ts'

/**
 * IMPORTANT: Cette fonction doit être appelée uniquement par Auth Hooks de Supabase,
 * pas en HTTP direct. Elle est destinée à créer automatiquement un profil utilisateur
 * lors de l'inscription via le hook "auth.users.created".
 *
 * L'accès direct HTTP est bloqué par vérification du header Authorization.
 */
serve(async (req) => {
  try {
    // Vérifier le header Authorization pour bloquer les appels HTTP directs non autorisés
    const authHeader = req.headers.get('authorization')

    if (!authHeader) {
      return new Response(
        JSON.stringify({
          error: 'Forbidden',
          message: 'This function can only be called via Supabase Auth Hooks, not directly via HTTP',
        }),
        {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    // Parse and validate request body
    const jsonData = await req.json()

    // Validate with Zod schema
    let validated
    try {
      validated = CreateProfileRequestSchema.parse(jsonData)
    } catch (err) {
      // Return 400 for validation errors
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: err.message,
          validationErrors: err.errors || [],
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      )
    }

    const { id, email, first_name, last_name } = validated

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    const { error } = await supabase.from('profiles').insert({
      id,
      email,
      first_name,
      last_name
    })

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
