import { createClient } from '@supabase/supabase-js';

// Configuration pour mode développement/test
const isDevelopment = import.meta.env.VITE_APP_MODE === 'development';
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://demo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'demo_key';

// Client Supabase (mock en développement)
export const supabase = isDevelopment ? {
  // Mock client pour les tests
  from: (table: string) => ({
    select: (query: string = '*') => ({ data: [], error: null }),
    insert: (data: any) => ({ data: [], error: null }),
    update: (data: any) => ({ data: [], error: null }),
    delete: () => ({ error: null }),
    eq: (column: string, value: any) => ({ data: [], error: null }),
    order: (column: string, options: any) => ({ data: [], error: null }),
    range: (from: number, to: number) => ({ data: [], error: null })
  }),
  rpc: (funcName: string, params?: any) => ({ data: 0, error: null }),
  auth: {
    getUser: () => ({ data: { user: { id: 'test-user', email: 'test@test.com' } }, error: null }),
    signInWithPassword: () => ({ data: { user: { id: 'test-user', email: 'test@test.com' } }, error: null }),
    signOut: () => ({ error: null })
  }
} : createClient(supabaseUrl, supabaseAnonKey);

// API functions for direct Supabase operations
export const api = {
  // Clients
  async getClients() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('clients')
      .select('*, groups(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createClient(clientData: any) {
    if (isDevelopment) return { id: 'test-client', ...clientData };
    
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClient(id: string, clientData: any) {
    if (isDevelopment) return { id, ...clientData };
    
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteClient(id: string) {
    if (isDevelopment) return;
    
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Groups
  async getGroups() {
    if (isDevelopment) return [];
    
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createGroup(groupData: any) {
    if (isDevelopment) return { id: 'test-group', ...groupData };
    
    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateGroup(id: string, groupData: any) {
    if (isDevelopment) return { id, ...groupData };
    
    const { data, error } = await supabase
      .from('groups')
      .update(groupData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async deleteGroup(id: string) {
    if (isDevelopment) return;
    
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}