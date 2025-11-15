import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import { ImportSegmentPayloadSchema, type ImportSegmentPayload } from './schemas.ts';
import { AdminGuardError, ensureAdmin } from '../shared/adminGuard.ts';
import { buildCorsHeaders, createPreflightResponse } from '../shared/cors.ts';
import { WebhookAuthError, ensureWebhookSecret } from '../shared/webhookAuth.ts';
import { initStructuredLog } from '../shared/logging.ts';
import { CIR_DATASETS, env } from '../shared/env.server.ts';

const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const SEGMENT_DATASET = CIR_DATASETS.segment;
const SEGMENT_CHANGE_REASON = `${SEGMENT_DATASET}_import`;

const CHUNK_SIZE = 500;

async function setAuditContext(batchId: string): Promise<void> {
  await supabase.rpc('set_current_batch_id', { batch_uuid: batchId });
  await supabase.rpc('set_change_reason', { reason: SEGMENT_CHANGE_REASON });
}

async function clearAuditContext(): Promise<void> {
  await supabase.rpc('clear_audit_context');
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

  const { requestId, log } = initStructuredLog('import-cir-segments', req);
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
  let createdBy: string | null = null;

  try {
    ensureWebhookSecret(authorization);
    await ensureAdmin(supabase, authorization);

    const json = await req.json();
    const parsed: ImportSegmentPayload = ImportSegmentPayloadSchema.parse(json);
    batchId = parsed.batchId;

    if (parsed.rows.length === 0) {
      throw new Error('Payload rows is empty');
    }

    const { data: batchMeta, error: batchMetaError } = await supabase
      .from('import_batches')
      .select('user_id')
      .eq('id', batchId)
      .single();

    if (batchMetaError) {
      throw batchMetaError;
    }

    createdBy = batchMeta?.user_id ?? null;

    if (!createdBy) {
      throw new Error('Impossible de déterminer l’auteur de l’import (created_by).');
    }

    await updateBatch(batchId, { status: 'processing', dataset_type: SEGMENT_DATASET });
    await setAuditContext(batchId);

    const { error: deleteError } = await supabase
      .from('brand_category_mappings')
      .delete()
      .not('segment', 'is', null);

    if (deleteError) {
      throw deleteError;
    }

    for (const chunk of chunkArray(parsed.rows)) {
      const payloadChunk = chunk.map(({ classif_cir: _classifCir, ...rest }) => ({
        ...rest,
        source_type: 'excel_upload',
        batch_id: batchId,
        created_by: createdBy
      }));

      const { error: insertError } = await supabase
        .from('brand_category_mappings')
        .insert(payloadChunk);

      if (insertError) {
        throw insertError;
      }
    }

    await clearAuditContext();

    await updateBatch(batchId, {
      status: 'completed',
      dataset_type: SEGMENT_DATASET,
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
    if (error instanceof WebhookAuthError) {
      log('warn', 'Webhook secret validation failed', { error_message: error.message });
      return respond(401, { error: 'Unauthorized', details: error.message });
    }

    if (error instanceof AdminGuardError) {
      log('warn', 'import-cir-segments unauthorized call', { error_message: error.message });
      return respond(403, { error: 'Forbidden', details: error.message });
    }

    log('error', 'import-cir-segments failed', {
      error_type: error instanceof Error ? error.constructor.name : 'Unknown',
      error_message: error instanceof Error ? error.message : String(error)
    });
    if (batchId) {
      await updateBatch(batchId, { status: 'failed', dataset_type: SEGMENT_DATASET }).catch(() => {});
      await clearAuditContext().catch(() => {});
    }

    const message =
      error instanceof Error
        ? error.message
        : typeof error === 'object' && error !== null && 'message' in error
          ? String((error as { message?: unknown }).message)
          : JSON.stringify(error);
    return respond(500, { error: message });
  }
});
