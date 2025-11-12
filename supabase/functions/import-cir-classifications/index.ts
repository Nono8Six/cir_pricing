import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { ImportClassificationPayloadSchema, type ImportClassificationPayload } from './schemas.ts';

const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || '*';
const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, serviceRoleKey);

const CHUNK_SIZE = 500;

async function setBatchContext(batchId: string): Promise<void> {
  await supabase.rpc('set_cir_batch_context', { batch_id: batchId });
}

async function clearBatchContext(): Promise<void> {
  await supabase.rpc('clear_cir_batch_context');
}

async function updateBatch(batchId: string, payload: Record<string, unknown>): Promise<void> {
  await supabase.from('import_batches').update(payload).eq('id', batchId);
}

function chunkArray<T>(rows: T[]): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
    chunks.push(rows.slice(i, i + CHUNK_SIZE));
  }
  return chunks;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  let batchId: string | null = null;

  try {
    const json = await req.json();
    const parsed: ImportClassificationPayload = ImportClassificationPayloadSchema.parse(json);
    batchId = parsed.batchId;

    if (parsed.rows.length === 0) {
      throw new Error('Payload rows is empty');
    }

    await updateBatch(batchId, { status: 'processing' });
    await setBatchContext(batchId);

    // Purge table avant réinsertion
    const { error: deleteError } = await supabase
      .from('cir_classifications')
      .delete()
      .not('combined_code', 'is', null);

    if (deleteError) {
      throw deleteError;
    }

    for (const chunk of chunkArray(parsed.rows)) {
      const { error: insertError } = await supabase.from('cir_classifications').insert(chunk);
      if (insertError) {
        throw insertError;
      }
    }

    await clearBatchContext();

    await updateBatch(batchId, {
      status: 'completed',
      processed_lines: parsed.rows.length,
      created_count: parsed.rows.length,
      updated_count: 0,
      skipped_count: 0,
      diff_summary: parsed.diffSummary ?? null,
      template_id: parsed.templateId ?? null
    });

    return new Response(JSON.stringify({
      ok: true,
      processed: parsed.rows.length,
      diff_summary: parsed.diffSummary ?? null
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    if (batchId) {
      await updateBatch(batchId, { status: 'failed' }).catch(() => {});
      await clearBatchContext().catch(() => {});
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

