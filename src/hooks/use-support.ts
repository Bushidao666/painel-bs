'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Lead, Tables, TablesInsert, TablesUpdate } from '@/lib/types/database'

export interface SupportSearchParams {
  query: string
}

export interface SupportPurchaseSearchParams {
  purchaseIdOrEmail: string
}

export function useSupportSearch({ query }: SupportSearchParams) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['support', 'search', query],
    enabled: !!query && query.length >= 2,
    queryFn: async () => {
      const like = `%${query}%`

      // Buscar por leads por nome, email, telefone
      const { data: leads, error: leadsError } = await supabase
        .from('leads')
        .select('*')
        .or(`email.ilike.${like},nome.ilike.${like},telefone.ilike.${like}`)
        .limit(50)

      if (leadsError) throw leadsError

      // Buscar membros founders por email/nome/telefone
      const { data: founders, error: foundersError } = await supabase
        .from('founder_members')
        .select('*')
        .or(`email.ilike.${like},nome.ilike.${like},telefone.ilike.${like}`)
        .limit(50)

      if (foundersError) throw foundersError

      return { leads: leads || [], founders: founders || [] }
    }
  })
}

export function useSupportPurchaseLookup({ purchaseIdOrEmail }: SupportPurchaseSearchParams) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['support', 'purchase', purchaseIdOrEmail],
    enabled: !!purchaseIdOrEmail,
    queryFn: async () => {
      // Tentar achar por ID de compra (founder_members.compra) ou por email
      let founderQuery = supabase
        .from('founder_members')
        .select('*')
        .limit(50)

      if (purchaseIdOrEmail.includes('@')) {
        founderQuery = founderQuery.ilike('email', `%${purchaseIdOrEmail}%`)
      } else {
        founderQuery = founderQuery.or(
          `compra.ilike.%${purchaseIdOrEmail}%,email.ilike.%${purchaseIdOrEmail}%`
        )
      }

      const { data: founders, error } = await founderQuery

      if (error) throw error

      // Buscar conversões relacionadas por lead_id
      const leadIds = (founders || [])
        .map((f) => f.lead_id)
        .filter(Boolean) as string[]

      let conversions: Tables<'conversions'>[] = []
      if (leadIds.length > 0) {
        const { data } = await supabase
          .from('conversions')
          .select('*')
          .in('lead_id', leadIds)
        conversions = data || []
      }

      return { founders: founders || [], conversions }
    }
  })
}

export function useSupportLeadDetails(leadId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['support', 'lead', leadId],
    enabled: !!leadId,
    queryFn: async () => {
      if (!leadId) return null

      const [leadRes, founderRes, eventsRes, conversionsRes, trackingRes] = await Promise.all([
        supabase.from('leads').select('*').eq('id', leadId).single(),
        supabase.from('founder_members').select('*').eq('lead_id', leadId).maybeSingle?.()
          ?? supabase.from('founder_members').select('*').eq('lead_id', leadId).limit(1),
        supabase.from('lead_events').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }).limit(200),
        supabase.from('conversions').select('*').eq('lead_id', leadId).order('created_at', { ascending: false }),
        supabase.from('lead_tracking').select('*').eq('lead_id', leadId).maybeSingle?.()
          ?? supabase.from('lead_tracking').select('*').eq('lead_id', leadId).limit(1),
      ])

      const lead = (leadRes as any).data as Lead | null
      const founder = (founderRes as any).data || (Array.isArray((founderRes as any).data) ? (founderRes as any).data?.[0] : null)
      const events = (eventsRes as any).data || []
      const conversions = (conversionsRes as any).data || []
      const tracking = (trackingRes as any).data || (Array.isArray((trackingRes as any).data) ? (trackingRes as any).data?.[0] : null)

      return { lead, founder, events, conversions, tracking }
    }
  })
}

