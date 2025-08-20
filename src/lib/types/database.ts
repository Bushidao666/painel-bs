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