// Utiliser l'instance unique depuis api.ts pour éviter les doublons
export { supabase } from './api';

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          role: 'admin' | 'commercial';
          first_name: string | null;
          last_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          role?: 'admin' | 'commercial';
          first_name?: string | null;
          last_name?: string | null;
        };
        Update: {
          email?: string;
          role?: 'admin' | 'commercial';
          first_name?: string | null;
          last_name?: string | null;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
        };
        Update: {
          name?: string;
        };
      };
      clients: {
        Row: {
          id: string;
          name: string;
          group_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          group_id?: string | null;
        };
        Update: {
          name?: string;
          group_id?: string | null;
        };
      };
      prices: {
        Row: {
          id: string;
          client_id: string;
          marque: string;
          reference: string;
          famille_fab: string;
          segment_cir: string;
          fsmega: number;
          fsfam: number;
          fssfa: number;
          classif_cir: string;
          purchase_price_ht: number;
          standard_tarif: number | null;
          standard_remise: number | null;
          deroge_remise: number | null;
          deroge_price: number | null;
          selling_price_ht: number;
          margin_amount: number | null;
          margin_rate: number | null;
          coefficient: number | null;
          validity_date: string | null;
          is_active: boolean;
          history: any;
          created_at: string;
          updated_at: string;
        };
      };
    };
  };
};