import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'npm:@supabase/supabase-js';
import * as XLSX from 'npm:xlsx';

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

  try {
    const { batch_id, dataset_type, file_path, mapping } = await req.json();

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
      // simple CSV parse (fallback) — pour robustesse, recommande un parseur dédié si besoin
      const [headerLine, ...rest] = text.split(/\r?\n/).filter(Boolean);
      const headers = headerLine.split(';').length > 1 ? headerLine.split(';') : headerLine.split(',');
      for (const line of rest) {
        const cols = (line.split(';').length > 1 ? line.split(';') : line.split(',')).map(s => s.trim());
        const obj: any = {};
        headers.forEach((h, i) => obj[h] = cols[i] ?? '');
        rows.push(obj);
      }
    } else {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      rows = XLSX.utils.sheet_to_json(ws, { defval: '' }) as any[];
    }

    // 4) Appliquer mapping de colonnes -> objet attendu
    // mapping: { fieldKey -> headerName } (ex: { marque:'MARQUE', cat_fab:'CAT' ... })
    const projected = rows.map((r) => {
      const o: any = {};
      for (const [field, header] of Object.entries(mapping || {})) {
        o[field] = (r as any)[header as string];
      }
      return o;
    });

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
    // Update batch status to failed
    if (typeof batch_id === 'string') {
      try {
        await supabase.from('import_batches').update({ status: 'failed' }).eq('id', batch_id);
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