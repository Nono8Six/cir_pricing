export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.3 (519615d)"
  }
  public: {
    Tables: {
      brand_category_mappings: {
        Row: {
          batch_id: string | null
          cat_fab: string
          cat_fab_l: string | null
          classif_cir: string | null
          codif_fair: string | null
          created_at: string | null
          created_by: string
          fsfam: number
          fsmega: number
          fssfa: number
          id: string
          marque: string
          natural_key: string | null
          segment: string
          source_type: string
          strategiq: number
          version: number
        }
        Insert: {
          batch_id?: string | null
          cat_fab: string
          cat_fab_l?: string | null
          classif_cir?: string | null
          codif_fair?: string | null
          created_at?: string | null
          created_by: string
          fsfam: number
          fsmega: number
          fssfa: number
          id?: string
          marque: string
          natural_key?: string | null
          segment: string
          source_type?: string
          strategiq?: number
          version?: number
        }
        Update: {
          batch_id?: string | null
          cat_fab?: string
          cat_fab_l?: string | null
          classif_cir?: string | null
          codif_fair?: string | null
          created_at?: string | null
          created_by?: string
          fsfam?: number
          fsmega?: number
          fssfa?: number
          id?: string
          marque?: string
          natural_key?: string | null
          segment?: string
          source_type?: string
          strategiq?: number
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "brand_category_mappings_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_mapping_history: {
        Row: {
          batch_id: string | null
          change_type: string
          changed_at: string
          changed_by: string
          history_id: string
          mapping_id: string
          new_data: Json | null
          old_data: Json | null
          reason: string
        }
        Insert: {
          batch_id?: string | null
          change_type: string
          changed_at?: string
          changed_by: string
          history_id?: string
          mapping_id: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string
        }
        Update: {
          batch_id?: string | null
          change_type?: string
          changed_at?: string
          changed_by?: string
          history_id?: string
          mapping_id?: string
          new_data?: Json | null
          old_data?: Json | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "brand_mapping_history_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "import_batches"
            referencedColumns: ["id"]
          },
        ]
      }
      cir_classifications: {
        Row: {
          combined_code: string
          combined_designation: string
          created_at: string | null
          fsfam_code: number
          fsfam_designation: string
          fsmega_code: number
          fsmega_designation: string
          fssfa_code: number
          fssfa_designation: string
          id: string
          updated_at: string | null
        }
        Insert: {
          combined_code: string
          combined_designation: string
          created_at?: string | null
          fsfam_code: number
          fsfam_designation: string
          fsmega_code: number
          fsmega_designation: string
          fssfa_code: number
          fssfa_designation: string
          id?: string
          updated_at?: string | null
        }
        Update: {
          combined_code?: string
          combined_designation?: string
          created_at?: string | null
          fsfam_code?: number
          fsfam_designation?: string
          fsmega_code?: number
          fsmega_designation?: string
          fssfa_code?: number
          fssfa_designation?: string
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      clients: {
        Row: {
          address: string | null
          agency: string | null
          cir_account_number: string | null
          city: string | null
          contacts: Json | null
          country: string | null
          created_at: string | null
          group_id: string | null
          id: string
          name: string
          siret: string | null
          updated_at: string | null
          zip: string | null
        }
        Insert: {
          address?: string | null
          agency?: string | null
          cir_account_number?: string | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name: string
          siret?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Update: {
          address?: string | null
          agency?: string | null
          cir_account_number?: string | null
          city?: string | null
          contacts?: Json | null
          country?: string | null
          created_at?: string | null
          group_id?: string | null
          id?: string
          name?: string
          siret?: string | null
          updated_at?: string | null
          zip?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_group_id_fkey"
            columns: ["group_id"]
            isOneToOne: false
            referencedRelation: "groups"
            referencedColumns: ["id"]
          },
        ]
      }
      groups: {
        Row: {
          created_at: string | null
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      import_batches: {
        Row: {
          comment: string
          created_at: string | null
          created_count: number | null
          dataset_type: string | null
          error_lines: number
          file_url: string | null
          filename: string
          id: string
          mapping: Json | null
          processed_lines: number
          skipped_count: number | null
          status: string
          timestamp: string
          total_lines: number
          updated_at: string | null
          updated_count: number | null
          user_id: string
          warnings: Json | null
        }
        Insert: {
          comment: string
          created_at?: string | null
          created_count?: number | null
          dataset_type?: string | null
          error_lines?: number
          file_url?: string | null
          filename: string
          id?: string
          mapping?: Json | null
          processed_lines?: number
          skipped_count?: number | null
          status?: string
          timestamp?: string
          total_lines?: number
          updated_at?: string | null
          updated_count?: number | null
          user_id: string
          warnings?: Json | null
        }
        Update: {
          comment?: string
          created_at?: string | null
          created_count?: number | null
          dataset_type?: string | null
          error_lines?: number
          file_url?: string | null
          filename?: string
          id?: string
          mapping?: Json | null
          processed_lines?: number
          skipped_count?: number | null
          status?: string
          timestamp?: string
          total_lines?: number
          updated_at?: string | null
          updated_count?: number | null
          user_id?: string
          warnings?: Json | null
        }
        Relationships: []
      }
      prices: {
        Row: {
          classif_cir: string | null
          client_id: string
          coefficient: number | null
          created_at: string | null
          deroge_number: string | null
          deroge_price: number | null
          deroge_remise: number | null
          famille_fab: string | null
          fsfam: number | null
          fsmega: number | null
          fssfa: number | null
          history: Json | null
          id: string
          is_active: boolean | null
          margin_amount: number | null
          margin_rate: number | null
          marque: string
          purchase_price_ht: number
          reference: string
          segment_cir: string | null
          selling_price_ht: number
          standard_remise: number | null
          standard_tarif: number | null
          supplier_file_format: Json | null
          updated_at: string | null
          validity_end: string | null
          validity_start: string | null
        }
        Insert: {
          classif_cir?: string | null
          client_id: string
          coefficient?: number | null
          created_at?: string | null
          deroge_number?: string | null
          deroge_price?: number | null
          deroge_remise?: number | null
          famille_fab?: string | null
          fsfam?: number | null
          fsmega?: number | null
          fssfa?: number | null
          history?: Json | null
          id?: string
          is_active?: boolean | null
          margin_amount?: number | null
          margin_rate?: number | null
          marque: string
          purchase_price_ht: number
          reference: string
          segment_cir?: string | null
          selling_price_ht: number
          standard_remise?: number | null
          standard_tarif?: number | null
          supplier_file_format?: Json | null
          updated_at?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Update: {
          classif_cir?: string | null
          client_id?: string
          coefficient?: number | null
          created_at?: string | null
          deroge_number?: string | null
          deroge_price?: number | null
          deroge_remise?: number | null
          famille_fab?: string | null
          fsfam?: number | null
          fsmega?: number | null
          fssfa?: number | null
          history?: Json | null
          id?: string
          is_active?: boolean | null
          margin_amount?: number | null
          margin_rate?: number | null
          marque?: string
          purchase_price_ht?: number
          reference?: string
          segment_cir?: string | null
          selling_price_ht?: number
          standard_remise?: number | null
          standard_tarif?: number | null
          supplier_file_format?: Json | null
          updated_at?: string | null
          validity_end?: string | null
          validity_start?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "prices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          email: string
          first_name: string | null
          id: string
          last_name: string | null
          role: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          first_name?: string | null
          id: string
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          first_name?: string | null
          id?: string
          last_name?: string | null
          role?: string
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Views: Record<never, never>
    Functions: {
      clear_audit_context: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      get_all_unique_fsfams: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_all_unique_fsmegas: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_all_unique_fssfas: {
        Args: Record<PropertyKey, never>
        Returns: number[]
      }
      get_all_unique_marques: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_all_unique_segments: {
        Args: Record<PropertyKey, never>
        Returns: string[]
      }
      get_classifications_by_codes: {
        Args: { codes: string[] }
        Returns: {
          combined_code: string
          combined_designation: string
          created_at: string | null
          fsfam_code: number
          fsfam_designation: string
          fsmega_code: number
          fsmega_designation: string
          fssfa_code: number
          fssfa_designation: string
          id: string
          updated_at: string | null
        }[]
      }
      get_mappings_by_keys: {
        Args: { keys: string[] }
        Returns: {
          batch_id: string | null
          cat_fab: string
          cat_fab_l: string | null
          classif_cir: string | null
          codif_fair: string | null
          created_at: string | null
          created_by: string
          fsfam: number
          fsmega: number
          fssfa: number
          id: string
          marque: string
          natural_key: string | null
          segment: string
          source_type: string
          strategiq: number
          version: number
        }[]
      }
      get_total_marques_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_total_segments_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      get_total_strategiques_count: {
        Args: Record<PropertyKey, never>
        Returns: number
      }
      rollback_import_batch: {
        Args: { p_batch_id: string }
        Returns: undefined
      }
      set_change_reason: {
        Args: { reason: string }
        Returns: undefined
      }
      set_current_batch_id: {
        Args: { batch_uuid: string }
        Returns: undefined
      }
    }
    Enums: Record<never, never>
    CompositeTypes: Record<never, never>
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
