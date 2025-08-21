export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      campaigns: {
        Row: {
          created_at: string | null
          data_lancamento: string
          descricao: string | null
          id: string
          meta_leads: number | null
          nome: string
          status: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          data_lancamento: string
          descricao?: string | null
          id?: string
          meta_leads?: number | null
          nome: string
          status?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          data_lancamento?: string
          descricao?: string | null
          id?: string
          meta_leads?: number | null
          nome?: string
          status?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      conversions: {
        Row: {
          campaign_id: string | null
          created_at: string | null
          id: string
          lead_id: string
          produto: string | null
          tipo_conversao: string | null
          valor: number | null
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          lead_id: string
          produto?: string | null
          tipo_conversao?: string | null
          valor?: number | null
        }
        Update: {
          campaign_id?: string | null
          created_at?: string | null
          id?: string
          lead_id?: string
          produto?: string | null
          tipo_conversao?: string | null
          valor?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "conversions_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversions_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_events: {
        Row: {
          created_at: string | null
          event_type: string
          id: string
          lead_id: string
          metadata: Json | null
        }
        Insert: {
          created_at?: string | null
          event_type: string
          id?: string
          lead_id: string
          metadata?: Json | null
        }
        Update: {
          created_at?: string | null
          event_type?: string
          id?: string
          lead_id?: string
          metadata?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      leads: {
        Row: {
          campaign_id: string | null
          created_at: string
          email: string
          id: string
          nome: string
          origem: string | null
          score: number | null
          status: string | null
          tags: string[] | null
          telefone: string
          temperatura: string | null
          updated_at: string
        }
        Insert: {
          campaign_id?: string | null
          created_at?: string
          email: string
          id?: string
          nome: string
          origem?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone: string
          temperatura?: string | null
          updated_at?: string
        }
        Update: {
          campaign_id?: string | null
          created_at?: string
          email?: string
          id?: string
          nome?: string
          origem?: string | null
          score?: number | null
          status?: string | null
          tags?: string[] | null
          telefone?: string
          temperatura?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_leads_campaign"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
        ]
      }
      scoring_rules: {
        Row: {
          ativo: boolean | null
          condicao: Json
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          pontos: number
          tipo: string | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          condicao: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          pontos: number
          tipo?: string | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          condicao?: Json
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          pontos?: number
          tipo?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      founder_members: {
        Row: {
          id: string
          lead_id: string | null
          nome: string
          email: string
          email_canonical: string | null
          telefone: string | null
          compra: string | null
          valor_compra: number | null
          purchase_metadata: Json
          purchased_at: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          lead_id?: string | null
          nome: string
          email: string
          email_canonical?: string | null
          telefone?: string | null
          compra?: string | null
          valor_compra?: number | null
          purchase_metadata?: Json
          purchased_at?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          lead_id?: string | null
          nome?: string
          email?: string
          email_canonical?: string | null
          telefone?: string | null
          compra?: string | null
          valor_compra?: number | null
          purchase_metadata?: Json
          purchased_at?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "founder_members_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      webhook_events: {
        Row: {
          id: string
          source: string
          event_type: string
          event_id: string | null
          payload: Json
          processed: boolean | null
          processed_at: string | null
          error_message: string | null
          lead_id: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          source: string
          event_type: string
          event_id?: string | null
          payload: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          lead_id?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          source?: string
          event_type?: string
          event_id?: string | null
          payload?: Json
          processed?: boolean | null
          processed_at?: string | null
          error_message?: string | null
          lead_id?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "webhook_events_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      sync_logs: {
        Row: {
          id: string
          service: string
          lead_id: string | null
          status: string
          data_synced: Json | null
          error_message: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          service: string
          lead_id?: string | null
          status: string
          data_synced?: Json | null
          error_message?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          service?: string
          lead_id?: string | null
          status?: string
          data_synced?: Json | null
          error_message?: string | null
          created_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sync_logs_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: false
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      lead_tracking: {
        Row: {
          id: string
          lead_id: string
          external_id: string | null
          fbp: string | null
          fbc: string | null
          fbclid: string | null
          utm_source: string | null
          utm_medium: string | null
          utm_campaign: string | null
          utm_content: string | null
          utm_term: string | null
          referrer: string | null
          landing_page_url: string | null
          user_agent: string | null
          ip: string | null
          url_parameters: Json | null
          first_seen_at: string | null
          last_seen_at: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          lead_id: string
          external_id?: string | null
          fbp?: string | null
          fbc?: string | null
          fbclid?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          referrer?: string | null
          landing_page_url?: string | null
          user_agent?: string | null
          ip?: string | null
          url_parameters?: Json | null
          first_seen_at?: string | null
          last_seen_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          lead_id?: string
          external_id?: string | null
          fbp?: string | null
          fbc?: string | null
          fbclid?: string | null
          utm_source?: string | null
          utm_medium?: string | null
          utm_campaign?: string | null
          utm_content?: string | null
          utm_term?: string | null
          referrer?: string | null
          landing_page_url?: string | null
          user_agent?: string | null
          ip?: string | null
          url_parameters?: Json | null
          first_seen_at?: string | null
          last_seen_at?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lead_tracking_lead_id_fkey"
            columns: ["lead_id"]
            isOneToOne: true
            referencedRelation: "leads"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          id: string
          role: string | null
          full_name: string | null
          department: string | null
          is_active: boolean | null
          invited_by: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id: string
          role?: string | null
          full_name?: string | null
          department?: string | null
          is_active?: boolean | null
          invited_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          role?: string | null
          full_name?: string | null
          department?: string | null
          is_active?: boolean | null
          invited_by?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      whatsapp_instances: {
        Row: {
          id: string
          instance_name: string
          phone_number: string | null
          status: string | null
          qr_code: string | null
          qr_code_expires_at: string | null
          connected_at: string | null
          last_sync: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          instance_name: string
          phone_number?: string | null
          status?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          connected_at?: string | null
          last_sync?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          instance_name?: string
          phone_number?: string | null
          status?: string | null
          qr_code?: string | null
          qr_code_expires_at?: string | null
          connected_at?: string | null
          last_sync?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      launch_groups: {
        Row: {
          id: string
          instance_id: string | null
          group_jid: string
          group_name: string | null
          group_description: string | null
          participant_count: number | null
          is_active: boolean | null
          is_launch_group: boolean | null
          last_message_at: string | null
          metadata: Json | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          instance_id?: string | null
          group_jid: string
          group_name?: string | null
          group_description?: string | null
          participant_count?: number | null
          is_active?: boolean | null
          is_launch_group?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          instance_id?: string | null
          group_jid?: string
          group_name?: string | null
          group_description?: string | null
          participant_count?: number | null
          is_active?: boolean | null
          is_launch_group?: boolean | null
          last_message_at?: string | null
          metadata?: Json | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      integration_config: {
        Row: {
          id: string
          service: string
          config: Json
          active: boolean | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          service: string
          config: Json
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          service?: string
          config?: Json
          active?: boolean | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      app_settings: {
        Row: {
          id: string
          key: string
          value: string | null
          category: string
          label: string
          description: string | null
          type: string | null
          is_required: boolean | null
          is_encrypted: boolean | null
          validation_regex: string | null
          placeholder: string | null
          options: Json | null
          updated_at: string | null
          updated_by: string | null
          requires_recalc: boolean | null
        }
        Insert: {
          id?: string
          key: string
          value?: string | null
          category: string
          label: string
          description?: string | null
          type?: string | null
          is_required?: boolean | null
          is_encrypted?: boolean | null
          validation_regex?: string | null
          placeholder?: string | null
          options?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          requires_recalc?: boolean | null
        }
        Update: {
          id?: string
          key?: string
          value?: string | null
          category?: string
          label?: string
          description?: string | null
          type?: string | null
          is_required?: boolean | null
          is_encrypted?: boolean | null
          validation_regex?: string | null
          placeholder?: string | null
          options?: Json | null
          updated_at?: string | null
          updated_by?: string | null
          requires_recalc?: boolean | null
        }
        Relationships: []
      }
      user_invites: {
        Row: {
          id: string
          email: string
          role: string | null
          invited_by: string
          invite_token: string | null
          expires_at: string | null
          accepted_at: string | null
          created_at: string | null
        }
        Insert: {
          id?: string
          email: string
          role?: string | null
          invited_by: string
          invite_token?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
        }
        Update: {
          id?: string
          email?: string
          role?: string | null
          invited_by?: string
          invite_token?: string | null
          expires_at?: string | null
          accepted_at?: string | null
          created_at?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_lead_score: {
        Args: { p_lead_id: string }
        Returns: number
      }
      update_lead_temperature: {
        Args: { p_lead_id: string }
        Returns: string
      }
      apply_event_scoring: {
        Args: { p_lead_id: string; p_event_type: string; p_campaign_id?: string | null }
        Returns: number
      }
      recalculate_lead_score_with_rules: {
        Args: { p_lead_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type TablesInsert<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type TablesUpdate<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']

export type Lead = Tables<'leads'>
export type Campaign = Tables<'campaigns'>
export type LeadEvent = Tables<'lead_events'>
export type Conversion = Tables<'conversions'>
export type ScoringRule = Tables<'scoring_rules'>