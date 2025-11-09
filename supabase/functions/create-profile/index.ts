import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { CreateProfileRequestSchema } from './schemas.ts'

serve(async (req) => {
  try {
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
