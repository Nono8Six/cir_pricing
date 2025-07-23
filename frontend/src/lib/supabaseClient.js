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
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('segment')
      .order('segment');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.segment))];
  },

  // Get ALL unique segments (no filters applied)
  async getAllUniqueSegments() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('segment')
      .order('segment');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.segment))].sort();
  },

  // Get unique marques for filter
  async getUniqueMarques() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('marque')
      .order('marque');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.marque))];
  },

  // Get ALL unique marques (no filters applied)
  async getAllUniqueMarques() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('marque')
      .order('marque');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.marque))].sort();
  },

  // Get unique FSMEGA values for filter
  async getUniqueFsmegas() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsmega')
      .order('fsmega');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsmega))];
  },

  // Get ALL unique FSMEGA values (no filters applied)
  async getAllUniqueFsmegas() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsmega')
      .order('fsmega');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsmega))].sort((a, b) => a - b);
  },

  // Get unique FSFAM values for filter
  async getUniqueFsfams() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsfam')
      .order('fsfam');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsfam))];
  },

  // Get ALL unique FSFAM values (no filters applied)
  async getAllUniqueFsfams() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsfam')
      .order('fsfam');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsfam))].sort((a, b) => a - b);
  },

  // Get unique FSSFA values for filter
  async getUniqueFssfas() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fssfa')
      .order('fssfa');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fssfa))];
  },

  // Get ALL unique FSSFA values (no filters applied)
  async getAllUniqueFssfas() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fssfa')
      .order('fssfa');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fssfa))].sort((a, b) => a - b);
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
    if (error) throw error;
    return data;
  }
};