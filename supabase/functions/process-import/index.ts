import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import * as XLSX from 'npm:xlsx';
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

/**
 * Compare deux enregistrements pour détecter des changements réels
 * @param newRow - Nouvel enregistrement validé par Zod
 * @param existingRow - Enregistrement existant depuis la DB
 * @param datasetType - Type de dataset ('mapping' | 'classification')
 * @returns true si au moins un champ comparable a changé
 */
function hasChanges(newRow: any, existingRow: any, datasetType: 'mapping' | 'classification'): boolean {
  if (datasetType === 'mapping') {
    // Champs à comparer (excluant id, created_at, classif_cir généré, natural_key, version, batch_id, created_by, source_type)
    const fields = ['segment', 'cat_fab_l', 'strategiq', 'codif_fair', 'fsmega', 'fsfam', 'fssfa'];

    for (const field of fields) {
      const newVal = newRow[field] ?? null;
      const existingVal = existingRow[field] ?? null;

      // Normaliser les valeurs pour comparaison
      if (newVal !== existingVal) {
        return true;
      }
    }

    return false;
  } else {
    // Champs à comparer pour classifications (excluant id, created_at, updated_at)
    const fields = [
      'fsmega_code', 'fsmega_designation',
      'fsfam_code', 'fsfam_designation',
      'fssfa_code', 'fssfa_designation',
      'combined_designation'
    ];

    for (const field of fields) {
      if (newRow[field] !== existingRow[field]) {
        return true;
      }
    }

    return false;
  }
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

    // 5) Bulk fetch des enregistrements existants pour comparaison (une seule fois avant la boucle)
    const existingRecordsMap = new Map<string, any>();

    if (dataset_type === 'mapping') {
      // Utiliser natural_key pour mappings
      const naturalKeys = projected.map(row => `${row.marque.toLowerCase()}|${row.cat_fab.toUpperCase()}`);
      const { data: existingMappings, error: fetchError } = await supabase
        .from('brand_category_mappings')
        .select('*')
        .in('natural_key', naturalKeys);

      if (fetchError) throw fetchError;

      for (const record of existingMappings || []) {
        existingRecordsMap.set(record.natural_key, record);
      }
    } else {
      // Utiliser combined_code pour classifications
      const combinedCodes = projected.map(row => row.combined_code);
      const { data: existingClassifications, error: fetchError } = await supabase
        .from('cir_classifications')
        .select('*')
        .in('combined_code', combinedCodes);

      if (fetchError) throw fetchError;

      for (const record of existingClassifications || []) {
        existingRecordsMap.set(record.combined_code, record);
      }
    }

    log('info', 'Existing records fetched for comparison', {
      batch_id,
      existing_count: existingRecordsMap.size,
      total_incoming: projected.length
    });

    // 6) Chunk & apply avec distinction INSERT/UPDATE/SKIP
    const chunkSize = 500;
    let created = 0, updated = 0, skipped = 0, processed = 0;

    for (let i = 0; i < projected.length; i += chunkSize) {
      const slice = projected.slice(i, i + chunkSize);
      const toInsert: any[] = [];
      const toUpdate: any[] = [];
      const toSkip: string[] = [];

      for (const row of slice) {
        const naturalKey = dataset_type === 'mapping'
          ? `${row.marque.toLowerCase()}|${row.cat_fab.toUpperCase()}`
          : row.combined_code;

        const existingRecord = existingRecordsMap.get(naturalKey);

        if (!existingRecord) {
          // Nouvelle ligne
          toInsert.push(row);
        } else if (hasChanges(row, existingRecord, dataset_type)) {
          // Ligne modifiée
          toUpdate.push(row);
        } else {
          // Aucun changement
          toSkip.push(naturalKey);
        }
      }

      // Insert nouveaux enregistrements
      if (toInsert.length > 0) {
        const table = dataset_type === 'mapping' ? 'brand_category_mappings' : 'cir_classifications';
        const { error: insertError } = await supabase.from(table).insert(toInsert);
        if (insertError) throw insertError;
        created += toInsert.length;
      }

      // Update enregistrements modifiés
      if (toUpdate.length > 0) {
        const table = dataset_type === 'mapping' ? 'brand_category_mappings' : 'cir_classifications';
        const conflict = dataset_type === 'mapping' ? 'marque,cat_fab' : 'combined_code';
        const { error: updateError } = await supabase.from(table).upsert(toUpdate, {
          onConflict: conflict,
          ignoreDuplicates: false
        });
        if (updateError) throw updateError;
        updated += toUpdate.length;
      }

      skipped += toSkip.length;
      processed += slice.length;

      // Update batch avec TOUS les compteurs
      await supabase.from('import_batches').update({
        processed_lines: processed,
        created_count: created,
        updated_count: updated,
        skipped_count: skipped,
        status: 'processing'
      }).eq('id', batch_id);

      log('info', 'Chunk processed', {
        batch_id,
        chunk_number: Math.floor(i / chunkSize) + 1,
        total_chunks: Math.ceil(projected.length / chunkSize),
        processed_so_far: processed,
        total: projected.length,
        chunk_created: toInsert.length,
        chunk_updated: toUpdate.length,
        chunk_skipped: toSkip.length,
        cumulative_created: created,
        cumulative_updated: updated,
        cumulative_skipped: skipped
      });
    }

    // 7) Terminer avec les compteurs finaux
    await supabase.from('import_batches').update({
      status: 'completed',
      processed_lines: processed,
      created_count: created,
      updated_count: updated,
      skipped_count: skipped
    }).eq('id', batch_id);

    log('info', 'Import completed successfully', {
      batch_id,
      dataset_type,
      total_processed: processed,
      created_count: created,
      updated_count: updated,
      skipped_count: skipped,
      efficiency: skipped > 0 ? `${((skipped / processed) * 100).toFixed(1)}% skipped (no changes)` : 'N/A'
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
