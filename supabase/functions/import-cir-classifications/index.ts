import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { ImportClassificationPayloadSchema, type ImportClassificationPayload } from './schemas.ts';
import { AdminGuardError, ensureAdmin } from '../shared/adminGuard.ts';
import { buildCorsHeaders, createPreflightResponse } from '../shared/cors.ts';
import { WebhookAuthError, ensureWebhookSecret } from '../shared/webhookAuth.ts';
import { initStructuredLog } from '../shared/logging.ts';
import { CIR_DATASETS, env } from '../shared/env.server.ts';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const CLASSIFICATION_DATASET = CIR_DATASETS.classification;

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
    return createPreflightResponse();
  }

  const { requestId, log } = initStructuredLog('import-cir-classifications', req);
  const corsHeaders = buildCorsHeaders();
  const jsonHeaders = {
    ...corsHeaders,
    'Content-Type': 'application/json',
    'X-Request-Id': requestId
  };
  const respond = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), { status, headers: jsonHeaders });
  const authorization = req.headers.get('authorization');

  let batchId: string | null = null;

  try {
    ensureWebhookSecret(authorization);
    await ensureAdmin(supabase, authorization);

    const json = await req.json();
    const parsed: ImportClassificationPayload = ImportClassificationPayloadSchema.parse(json);
    batchId = parsed.batchId;

    if (parsed.rows.length === 0) {
      throw new Error('Payload rows is empty');
    }

    await updateBatch(batchId, { status: 'processing', dataset_type: CLASSIFICATION_DATASET });
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
      dataset_type: CLASSIFICATION_DATASET,
      processed_lines: parsed.rows.length,
      created_count: parsed.rows.length,
      updated_count: 0,
      skipped_count: 0,
      diff_summary: parsed.diffSummary ?? null,
      template_id: parsed.templateId ?? null
    });

    return respond(200, {
      ok: true,
      processed: parsed.rows.length,
      diff_summary: parsed.diffSummary ?? null
    });
  } catch (error) {
    if (error instanceof WebhookAuthError) {
      log('warn', 'Webhook secret validation failed', { error_message: error.message });
      return respond(401, { error: 'Unauthorized', details: error.message });
    }

    if (error instanceof AdminGuardError) {
      log('warn', 'import-cir-classifications unauthorized call', { error_message: error.message });
      return respond(403, { error: 'Forbidden', details: error.message });
    }

    log('error', 'import-cir-classifications failed', {
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      error_message: error instanceof Error ? error.message : String(error)
    });
    if (batchId) {
      await updateBatch(batchId, { status: 'failed', dataset_type: CLASSIFICATION_DATASET }).catch(() => {});
      await clearBatchContext().catch(() => {});
    }

    const message = error instanceof Error ? error.message : 'Unexpected error';
    return respond(500, { error: message });
  }
});
