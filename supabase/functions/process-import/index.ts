import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import * as XLSX from 'npm:xlsx';
import Papa from 'npm:papaparse';
import {
  ProcessImportRequestSchema,
  MappingRowSchema,
  ClassificationRowSchema
} from './schemas.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client outside request handler for better error handling
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);

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

    // If validation errors found, return them to user
    if (validationErrors.length > 0) {
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
    }

    // 6) Terminer
    await supabase.from('import_batches').update({ status: 'completed' }).eq('id', batch_id);
    return new Response(JSON.stringify({ ok: true, processed }), { 
      status: 200, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (e) {
    console.error('Edge Function Error:', e);
    // Update batch status to failed (if batch_id was successfully extracted)
    if (batchId) {
      try {
        await supabase.from('import_batches').update({ status: 'failed' }).eq('id', batchId);
      } catch (updateErr) {
        console.error('Failed to update batch status:', updateErr);
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