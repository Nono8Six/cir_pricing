import { createClient } from '@supabase/supabase-js';
import { env } from './env';

/**
 * Supabase client instance with validated credentials
 * Uses environment variables validated at startup
 */
export const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// API functions for direct Supabase operations
export const api = {
  // Clients
  async getClients() {
    const { data, error } = await supabase
      .from('clients')
      .select('*, groups(name)')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async createClient(clientData: any) {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateClient(id: string, clientData: any) {
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
    const { error } = await supabase
      .from('clients')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  },

  // Groups
  async getGroups() {
    const { data, error } = await supabase
      .from('groups')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async createGroup(groupData: any) {
    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async updateGroup(id: string, groupData: any) {
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
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  }
}