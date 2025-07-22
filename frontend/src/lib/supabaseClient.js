import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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

  // Get unique marques for filter
  async getUniqueMarques() {
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('marque')
      .order('marque');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.marque))];
  }
};