import { createClient } from '@supabase/supabase-js';
import { env } from './env';
import type { TablesInsert, TablesUpdate } from '../types/database.types';

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

  async createClient(clientData: TablesInsert<'clients'>) {
    const { data, error } = await supabase
      .from('clients')
      .insert([clientData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateClient(id: string, clientData: TablesUpdate<'clients'>) {
    const { data, error } = await supabase
      .from('clients')
      .update(clientData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteClient(id: string): Promise<void> {
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

  async createGroup(groupData: TablesInsert<'groups'>) {
    const { data, error } = await supabase
      .from('groups')
      .insert([groupData])
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateGroup(id: string, groupData: TablesUpdate<'groups'>) {
    const { data, error } = await supabase
      .from('groups')
      .update(groupData)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteGroup(id: string): Promise<void> {
    const { error } = await supabase
      .from('groups')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }
}