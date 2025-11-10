import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
// @deno-types="https://cdn.sheetjs.com/xlsx-0.20.3/package/types/index.d.ts"
import * as XLSX from 'https://cdn.sheetjs.com/xlsx-0.20.3/package/xlsx.mjs';
import Papa from 'npm:papaparse';
import {
  ProcessImportRequestSchema,
  MappingRowSchema,
  ClassificationRowSchema
} from './schemas.ts';

// CORS configuration - restrict to allowed origins only (security best practice)
const ALLOWED_ORIGIN = Deno.env.get('ALLOWED_ORIGIN') || 'http://localhost:5173';

const corsHeaders = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client outside request handler for better error handling
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

// Structured logging helper
function log(level: 'info' | 'error' | 'warn', message: string, context?: Record<string, any>) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    function: 'process-import',
    ...context
  };
  console.log(JSON.stringify(logEntry));
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // Track batch_id for error handling in catch block
  let batchId: string | null = null;

  try {
    // Parse and validate request body
    const jsonData = await req.json();

    let validated;
    try {
      validated = ProcessImportRequestSchema.parse(jsonData);
    } catch (validationError: any) {
      return new Response(JSON.stringify({
        error: 'Validation failed',
        details: validationError.errors || validationError.message,
        validationErrors: validationError.issues || []
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const { batch_id, dataset_type, file_path, mapping } = validated;
    batchId = batch_id;

    log('info', 'Import process started', { batch_id, dataset_type, file_path });

    // 1) Récupérer le lot, quick guard
    const { data: batch } = await supabase.from('import_batches').select('*').eq('id', batch_id).single();
    if (!batch) return new Response(JSON.stringify({ error: 'batch not found' }), { 
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

    // 2) Télécharger le fichier Storage
    const { data: blob, error: dlErr } = await supabase.storage.from('imports').download(file_path);
    if (dlErr || !blob) throw dlErr || new Error('download failed');

    // 3) Parse
    let rows: any[] = [];
    if (file_path.toLowerCase().endsWith('.csv')) {
      const text = await blob.text();
      // Use PapaParse for robust CSV parsing (handles quotes, commas in values, etc.)
      const parseResult = Papa.parse(text, {
        header: true,
        skipEmptyLines: true,
        delimiter: '', // Auto-detect delimiter (comma or semicolon)
        quoteChar: '"',
        transformHeader: (header: string) => header.trim(),
        transform: (value: string) => value.trim()
      });

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV parsing errors: ${JSON.stringify(parseResult.errors)}`);
      }

      rows = parseResult.data as any[];
    } else {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
    }

    log('info', 'File parsed successfully', { batch_id, total_rows: rows.length, file_type: file_path.toLowerCase().endsWith('.csv') ? 'csv' : 'excel' });

    // 4) Appliquer mapping de colonnes -> objet attendu + validation Zod
    // mapping: { fieldKey -> headerName } (ex: { marque:'MARQUE', cat_fab:'CAT' ... })
    const validationErrors: any[] = [];
    const projected: any[] = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      const o: any = {};
      for (const [field, header] of Object.entries(mapping || {})) {
        o[field] = (r as any)[header as string];
      }

      // Validate each row with appropriate schema
      try {
        const rowSchema = dataset_type === 'mapping' ? MappingRowSchema : ClassificationRowSchema;
        const validatedRow = rowSchema.parse(o);
        projected.push(validatedRow);
      } catch (validationError: any) {
        validationErrors.push({
          row: i + 1,
          data: o,
          errors: validationError.issues || [{ message: validationError.message }]
        });
      }
    }

    log('info', 'Row validation completed', {
      batch_id,
      valid_rows: projected.length,
      invalid_rows: validationErrors.length,
      total_rows: rows.length
    });

    // If validation errors found, return them to user
    if (validationErrors.length > 0) {
      log('warn', 'Validation errors detected, aborting import', {
        batch_id,
        error_count: validationErrors.length
      });
      return new Response(JSON.stringify({
        error: 'Row validation failed',
        message: `${validationErrors.length} row(s) failed validation`,
        validationErrors: validationErrors.slice(0, 10), // Limit to first 10 errors for readability
        totalErrors: validationErrors.length
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // 5) Chunk & apply par dataset_type
    const chunkSize = 500;
    let created = 0, updated = 0, skipped = 0, processed = 0;
    const upsert = async (table: string, conflict: string, payload: any[]) => {
      const { error } = await supabase.from(table).upsert(payload, { onConflict: conflict, ignoreDuplicates: false });
      if (error) throw error;
    };

    for (let i = 0; i < projected.length; i += chunkSize) {
      const slice = projected.slice(i, i + chunkSize);
      // stats mini: ici on fait un upsert direct (remplace), pour une première version asynchrone
      if (dataset_type === 'mapping') {
        await upsert('brand_category_mappings', 'marque,cat_fab', slice);
        // Option: compter created/updated via retour (non trivial en v1); on maj processed
      } else {
        await upsert('cir_classifications', 'combined_code', slice);
      }
      processed += slice.length;
      await supabase.from('import_batches').update({ processed_lines: processed, status: 'processing' }).eq('id', batch_id);

      log('info', 'Chunk processed', {
        batch_id,
        chunk_number: Math.floor(i / chunkSize) + 1,
        processed_so_far: processed,
        total: projected.length
      });
    }

    // 6) Terminer
    await supabase.from('import_batches').update({ status: 'completed' }).eq('id', batch_id);

    log('info', 'Import completed successfully', {
      batch_id,
      total_processed: processed,
      dataset_type
    });
    return new Response(JSON.stringify({ ok: true, processed }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    log('error', 'Import processing failed', {
      batch_id: batchId,
      error_type: e instanceof Error ? e.constructor.name : 'Unknown',
      error_message: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined
    });

    // Update batch status to failed (if batch_id was successfully extracted)
    if (batchId) {
      try {
        await supabase.from('import_batches').update({ status: 'failed' }).eq('id', batchId);
        log('info', 'Batch status updated to failed', { batch_id: batchId });
      } catch (updateErr) {
        log('error', 'Failed to update batch status', {
          batch_id: batchId,
          update_error: updateErr instanceof Error ? updateErr.message : String(updateErr)
        });
      }
    }
    return new Response(JSON.stringify({ 
      error: String(e), 
      details: e instanceof Error ? e.message : 'Unknown error',
      stack: e instanceof Error ? e.stack : undefined
    }), { 
      status: 500, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});
