import { supabase } from './api';

export { supabase };

const isDevelopment = import.meta.env?.VITE_APP_MODE === 'development';

// Mock responses for development
const mockMappings = [];
const mockClassifications = [];

// API functions for brand category mappings
export const mappingApi = {
  // Get all mappings with filters
  async getMappings(filters = {}, page = 1, limit = 20) {
    if (isDevelopment) {
      return { data: mockMappings, count: mockMappings.length };
    }
    
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
    if (isDevelopment) {
      const newMapping = { id: Date.now().toString(), ...mappingData };
      mockMappings.push(newMapping);
      return newMapping;
    }
    
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
    if (isDevelopment) {
      const index = mockMappings.findIndex(m => m.id === id);
      if (index !== -1) {
        mockMappings[index] = { ...mockMappings[index], ...mappingData };
        return mockMappings[index];
      }
      return mappingData;
    }
    
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
    if (isDevelopment) {
      const index = mockMappings.findIndex(m => m.id === id);
      if (index !== -1) {
        mockMappings.splice(index, 1);
      }
      return;
    }
    
    const { error } = await supabase
      .from('brand_category_mappings')
      .delete()
      .eq('id', id);

    if (error) throw error;
  },

  // Insert a new import batch and return the created row
  async createImportBatch(filename, userId, stats) {
    if (isDevelopment) {
      return { id: Date.now().toString(), filename, user_id: userId, ...stats };
    }
    
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
    if (isDevelopment) {
      console.log('🔄 Mock batch upsert mappings:', mappings.length, 'items');
      mockMappings.push(...mappings.map(m => ({ ...m, id: Date.now().toString() + Math.random() })));
      return mappings;
    }
    
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
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('segment')
      .order('segment');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.segment))];
  },

  // Get ALL unique segments (no filters applied)
  async getAllUniqueSegments() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase.rpc('get_all_unique_segments');

    if (error) throw error;
    return data || [];
  },

  // Get unique marques for filter
  async getUniqueMarques() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('marque')
      .order('marque');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.marque))];
  },

  // Get ALL unique marques (no filters applied)
  async getAllUniqueMarques() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase.rpc('get_all_unique_marques');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSMEGA values for filter
  async getUniqueFsmegas() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsmega')
      .order('fsmega');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsmega))];
  },

  // Get ALL unique FSMEGA values (no filters applied)
  async getAllUniqueFsmegas() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase.rpc('get_all_unique_fsmegas');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSFAM values for filter
  async getUniqueFsfams() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fsfam')
      .order('fsfam');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fsfam))];
  },

  // Get ALL unique FSFAM values (no filters applied)
  async getAllUniqueFsfams() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase.rpc('get_all_unique_fsfams');

    if (error) throw error;
    return data || [];
  },

  // Get unique FSSFA values for filter
  async getUniqueFssfas() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('brand_category_mappings')
      .select('fssfa')
      .order('fssfa');
    
    if (error) throw error;
    return [...new Set(data.map(item => item.fssfa))];
  },

  // Get ALL unique FSSFA values (no filters applied)
  async getAllUniqueFssfas() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase.rpc('get_all_unique_fssfas');

    if (error) throw error;
    return data || [];
  },

  // Get all mappings without pagination for preview comparison
  async getAllBrandCategoryMappings() {
    if (isDevelopment) return mockMappings;
    
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
    if (isDevelopment) return 0;
    
    const { data, error } = await supabase.rpc('get_total_segments_count');
    if (error) throw error;
    return data;
  },

  // Get total count of unique marques via RPC
  async getTotalMarquesCount() {
    if (isDevelopment) return 0;
    
    const { data, error } = await supabase.rpc('get_total_marques_count');
    if (error) throw error;
    return data;
  },

  // Get total count of strategic mappings via RPC
  async getTotalStrategiquesCount() {
    if (isDevelopment) return 0;
    
    const { data, error } = await supabase.rpc('get_total_strategiques_count');

    if (error) {
      throw error;
    }
    return data;
  }
};

// API functions for CIR classifications
export const cirClassificationApi = {
  // Get all classifications
  async getAllClassifications() {
    if (isDevelopment) return mockClassifications;
    
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
    if (isDevelopment) {
      return { data: mockClassifications, count: mockClassifications.length };
    }
    
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
    if (isDevelopment) {
      console.log('✅ Mock batch upsert classifications SUCCESS:', classifications.length, 'items imported');
      console.log('Sample data:', classifications.slice(0, 3));
      mockClassifications.push(...classifications.map(c => ({ 
        ...c, 
        id: Date.now().toString() + Math.random() 
      })));
      return classifications;
    }
    
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
    if (isDevelopment) return mockClassifications;
    
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
    if (isDevelopment) return mockClassifications;
    
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
    if (isDevelopment) return mockClassifications;
    
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
    if (isDevelopment) {
      const newClassification = { id: Date.now().toString(), ...classificationData };
      mockClassifications.push(newClassification);
      return newClassification;
    }
    
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
    if (isDevelopment) {
      const index = mockClassifications.findIndex(c => c.id === id);
      if (index !== -1) {
        mockClassifications[index] = { ...mockClassifications[index], ...classificationData };
        return mockClassifications[index];
      }
      return classificationData;
    }
    
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
    if (isDevelopment) {
      const index = mockClassifications.findIndex(c => c.id === id);
      if (index !== -1) {
        mockClassifications.splice(index, 1);
      }
      return;
    }
    
    const { error } = await supabase
      .from('cir_classifications')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
};