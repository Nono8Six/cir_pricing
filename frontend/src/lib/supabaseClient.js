import { supabase } from './api';

export { supabase };

// API functions for brand category mappings
export const mappingApi = {
  // Get all mappings with filters
  async getMappings(filters = {}, page = 1, limit = 20) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase
      .from('brand_category_mappings')
      .select('*')
      .order('created_at', { ascending: false })
      .range(from, to);

    if (filters.marque) {
      query = query.ilike('marque', `%${filters.marque}%`);
    }
    if (filters.cat_fab) {
      query = query.ilike('cat_fab', `%${filters.cat_fab}%`);
    }
    if (filters.segment) {
      query = query.eq('segment', filters.segment);
    }
    if (filters.fsmega) {
      query = query.eq('fsmega', filters.fsmega);
    }
    if (filters.fsfam) {
      query = query.eq('fsfam', filters.fsfam);
    }
    if (filters.fssfa) {
      query = query.eq('fssfa', filters.fssfa);
    }
    if (filters.strategiq !== undefined) {
      query = query.eq('strategiq', filters.strategiq);
    }
    if (filters.source_type) {
      query = query.eq('source_type', filters.source_type);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('brand_category_mappings')
      .select('*', { count: 'exact', head: true });

    if (filters.marque) {
      countQuery = countQuery.ilike('marque', `%${filters.marque}%`);
    }
    if (filters.cat_fab) {
      countQuery = countQuery.ilike('cat_fab', `%${filters.cat_fab}%`);
    }
    if (filters.segment) {
      countQuery = countQuery.eq('segment', filters.segment);
    }
    if (filters.fsmega) {
      countQuery = countQuery.eq('fsmega', filters.fsmega);
    }
    if (filters.fsfam) {
      countQuery = countQuery.eq('fsfam', filters.fsfam);
    }
    if (filters.fssfa) {
      countQuery = countQuery.eq('fssfa', filters.fssfa);
    }
    if (filters.strategiq !== undefined) {
      countQuery = countQuery.eq('strategiq', filters.strategiq);
    }
    if (filters.source_type) {
      countQuery = countQuery.eq('source_type', filters.source_type);
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);
    
    if (error) throw error;
    if (countError) throw countError;
    
    return {
      data: data || [],
      count: count || 0
    };
  },

  // Create new mapping
  async createMapping(mappingData) {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .insert([mappingData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update mapping
  async updateMapping(id, mappingData) {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .update(mappingData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete mapping
  async deleteMapping(id) {
    const { error } = await supabase
      .from('brand_category_mappings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Insert a new import batch and return the created row
  async createImportBatch(filename, userId, stats) {
    const { data, error } = await supabase
      .from('import_batches')
      .insert([{ filename, user_id: userId, ...stats }])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Batch upsert mappings (for Excel upload)
  async batchUpsertMappings(mappings) {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .upsert(mappings, {
        onConflict: 'marque,cat_fab',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get unique segments for filter
  async getUniqueSegments() {
    const { data, error } = await supabase.rpc('get_all_unique_segments');
    if (error) throw error;
    return data || [];
  },

  // Get ALL unique segments (no filters applied)
  async getAllUniqueSegments() {
    const { data, error } = await supabase.rpc('get_all_unique_segments');

    if (error) throw error;
    return data || [];
  },

  // Get unique marques for filter
  async getUniqueMarques() {
    const { data, error } = await supabase.rpc('get_all_unique_marques');
    if (error) throw error;
    return data || [];
  },

  // Get ALL unique marques (no filters applied)
  async getAllUniqueMarques() {
    const { data, error } = await supabase.rpc('get_all_unique_marques');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSMEGA values for filter
  async getUniqueFsmegas() {
    const { data, error } = await supabase.rpc('get_all_unique_fsmegas');
    if (error) throw error;
    return data || [];
  },

  // Get ALL unique FSMEGA values (no filters applied)
  async getAllUniqueFsmegas() {
    const { data, error } = await supabase.rpc('get_all_unique_fsmegas');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSFAM values for filter
  async getUniqueFsfams() {
    const { data, error } = await supabase.rpc('get_all_unique_fsfams');
    if (error) throw error;
    return data || [];
  },

  // Get ALL unique FSFAM values (no filters applied)
  async getAllUniqueFsfams() {
    const { data, error } = await supabase.rpc('get_all_unique_fsfams');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSSFA values for filter
  async getUniqueFssfas() {
    const { data, error } = await supabase.rpc('get_all_unique_fssfas');
    if (error) throw error;
    return data || [];
  },

  // Get ALL unique FSSFA values (no filters applied)
  async getAllUniqueFssfas() {
    const { data, error } = await supabase.rpc('get_all_unique_fssfas');

    if (error) throw error;
    return data || [];
  },

  // Get all mappings without pagination for preview comparison
  async getAllBrandCategoryMappings() {
    const batchSize = 1000;
    let from = 0;
    let allData = [];

    while (true) {
      const { data, error } = await supabase
        .from('brand_category_mappings')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, from + batchSize - 1);

      if (error) throw error;
      if (data) {
        allData = allData.concat(data);
      }

      if (!data || data.length < batchSize) break;

      from += batchSize;
    }

    return allData;
  },

  // Get total count of unique segments via RPC
  async getTotalSegmentsCount() {
    const { data, error } = await supabase.rpc('get_total_segments_count');
    if (error) throw error;
    return data;
  },

  // Get total count of unique marques via RPC
  async getTotalMarquesCount() {
    const { data, error } = await supabase.rpc('get_total_marques_count');
    if (error) throw error;
    return data;
  },

  // Get total count of strategic mappings via RPC
  async getTotalStrategiquesCount() {
    const { data, error } = await supabase.rpc('get_total_strategiques_count');

    if (error) {
      throw error;
    }
    return data;
  },

  // Lookup mappings by natural_key via RPC
  async getMappingsByKeys(keys) {
    if (!Array.isArray(keys) || keys.length === 0) return [];
    const { data, error } = await supabase.rpc('get_mappings_by_keys', { keys });
    if (error) throw error;
    return data || [];
  }
};

// API functions for CIR classifications
export const cirClassificationApi = {
  // Get all classifications
  async getAllClassifications() {
    const { data, error } = await supabase
      .from('cir_classifications')
      .select('*')
      .order('fsmega_code', { ascending: true })
      .order('fsfam_code', { ascending: true })
      .order('fssfa_code', { ascending: true });
    
    if (error) throw error;
    return data || [];
  },

  // Get classifications with filters and pagination
  async getClassifications(filters = {}, page = 1, limit = 50) {
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    
    let query = supabase
      .from('cir_classifications')
      .select('*')
      .order('fsmega_code', { ascending: true })
      .order('fsfam_code', { ascending: true })
      .order('fssfa_code', { ascending: true })
      .range(from, to);

    if (filters.fsmega_code) {
      query = query.eq('fsmega_code', filters.fsmega_code);
    }
    if (filters.fsfam_code) {
      query = query.eq('fsfam_code', filters.fsfam_code);
    }
    if (filters.fssfa_code) {
      query = query.eq('fssfa_code', filters.fssfa_code);
    }
    if (filters.combined_code) {
      query = query.ilike('combined_code', `%${filters.combined_code}%`);
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('cir_classifications')
      .select('*', { count: 'exact', head: true });

    if (filters.fsmega_code) {
      countQuery = countQuery.eq('fsmega_code', filters.fsmega_code);
    }
    if (filters.fsfam_code) {
      countQuery = countQuery.eq('fsfam_code', filters.fsfam_code);
    }
    if (filters.fssfa_code) {
      countQuery = countQuery.eq('fssfa_code', filters.fssfa_code);
    }
    if (filters.combined_code) {
      countQuery = countQuery.ilike('combined_code', `%${filters.combined_code}%`);
    }

    const [{ data, error }, { count, error: countError }] = await Promise.all([
      query,
      countQuery
    ]);
    
    if (error) throw error;
    if (countError) throw countError;
    
    return {
      data: data || [],
      count: count || 0
    };
  },

  // Batch upsert classifications (for Excel upload)
  async batchUpsertClassifications(classifications) {
    const { data, error } = await supabase
      .from('cir_classifications')
      .upsert(classifications, {
        onConflict: 'combined_code',
        ignoreDuplicates: false
      })
      .select();
    
    if (error) throw error;
    return data;
  },

  // Get unique FSMEGA codes
  async getAllUniqueFsmegaCodes() {
    const { data, error } = await supabase
      .from('cir_classifications')
      .select('fsmega_code, fsmega_designation')
      .order('fsmega_code');
    
    if (error) throw error;
    
    // Remove duplicates and return unique mega families
    const uniqueMegaFamilies = [];
    const seen = new Set();
    
    for (const item of data || []) {
      if (!seen.has(item.fsmega_code)) {
        seen.add(item.fsmega_code);
        uniqueMegaFamilies.push(item);
      }
    }
    
    return uniqueMegaFamilies;
  },

  // Get unique FSFAM codes for a given FSMEGA
  async getAllUniqueFsfamCodes(fsmegaCode = null) {
    let query = supabase
      .from('cir_classifications')
      .select('fsfam_code, fsfam_designation')
      .order('fsfam_code');
    
    if (fsmegaCode) {
      query = query.eq('fsmega_code', fsmegaCode);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Remove duplicates and return unique families
    const uniqueFamilies = [];
    const seen = new Set();
    
    for (const item of data || []) {
      if (!seen.has(item.fsfam_code)) {
        seen.add(item.fsfam_code);
        uniqueFamilies.push(item);
      }
    }
    
    return uniqueFamilies;
  },

  // Get unique FSSFA codes for given FSMEGA and FSFAM
  async getAllUniqueFssfaCodes(fsmegaCode = null, fsfamCode = null) {
    let query = supabase
      .from('cir_classifications')
      .select('fssfa_code, fssfa_designation')
      .order('fssfa_code');
    
    if (fsmegaCode) {
      query = query.eq('fsmega_code', fsmegaCode);
    }
    if (fsfamCode) {
      query = query.eq('fsfam_code', fsfamCode);
    }
    
    const { data, error } = await query;
    
    if (error) throw error;
    
    // Remove duplicates and return unique sub-families
    const uniqueSubFamilies = [];
    const seen = new Set();
    
    for (const item of data || []) {
      if (!seen.has(item.fssfa_code)) {
        seen.add(item.fssfa_code);
        uniqueSubFamilies.push(item);
      }
    }
    
    return uniqueSubFamilies;
  },

  // Create new classification
  async createClassification(classificationData) {
    const { data, error } = await supabase
      .from('cir_classifications')
      .insert([classificationData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Update classification
  async updateClassification(id, classificationData) {
    const { data, error } = await supabase
      .from('cir_classifications')
      .update(classificationData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Delete classification
  async deleteClassification(id) {
    const { error } = await supabase
      .from('cir_classifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Lookup classifications by combined_code via RPC
  async getByCodes(codes) {
    if (!Array.isArray(codes) || codes.length === 0) return [];
    const { data, error } = await supabase.rpc('get_classifications_by_codes', { codes });
    if (error) throw error;
    return data || [];
  }
};
