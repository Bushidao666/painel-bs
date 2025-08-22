'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Lead, TablesInsert, TablesUpdate } from '@/lib/types/database'

interface UseLeadsPaginatedParams {
  page?: number
  pageSize?: number
  searchTerm?: string
  temperatureFilter?: string
  originFilter?: string
  campaignId?: string
  inGroups?: 'all' | 'in' | 'out'
}

interface PaginatedLeadsResponse {
  data: Array<Lead & { campaigns?: { nome: string } | null }>
  count: number
  totalPages: number
  currentPage: number
  pageSize: number
  from: number
  to: number
}

export function useLeadsPaginated({
  page = 1,
  pageSize = 25,
  searchTerm = '',
  temperatureFilter = 'all',
  originFilter = 'all',
  campaignId,
  inGroups = 'all'
}: UseLeadsPaginatedParams = {}) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const queryKey = ['leads', 'paginated', page, pageSize, searchTerm, temperatureFilter, originFilter, inGroups, campaignId]

  const { data, isLoading, error, isFetching } = useQuery({
    queryKey,
    queryFn: async (): Promise<PaginatedLeadsResponse> => {
      // Calcular offset
      const from = (page - 1) * pageSize
      const to = from + pageSize - 1

      // Buscar IDs únicos por telefone via RPC e depois carregar linhas
      const { data: uniq, error: uniqErr }: any = await supabase.rpc('leads_unique_by_identity_paginated', {
        p_search: searchTerm || null,
        p_temperature: temperatureFilter === 'all' ? null : temperatureFilter,
        p_origin: originFilter === 'all' ? null : originFilter,
        p_in_groups: inGroups,
        p_campaign_id: campaignId || null,
        p_limit: pageSize,
        p_offset: (page - 1) * pageSize,
      })
      if (uniqErr) throw uniqErr
      const ids = (uniq?.ids || [])
      const totalCount = uniq?.total || 0

      let query = supabase
        .from('leads')
        .select('*, campaigns(nome)')
        .in('id', ids.length ? ids : ['00000000-0000-0000-0000-000000000000'])

      // Aplicar filtros
      if (searchTerm) {
        query = query.or(`nome.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%,telefone.ilike.%${searchTerm}%`)
      }

      if (temperatureFilter !== 'all') {
        query = query.eq('temperatura', temperatureFilter)
      }

      if (originFilter !== 'all') {
        query = query.eq('origem', originFilter)
      }

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      // Filtro em grupos: usa flag derivada
      if (inGroups === 'in') {
        query = query.eq('in_launch_group', true)
      } else if (inGroups === 'out') {
        query = query.or('in_launch_group.is.null,in_launch_group.eq.false')
      }

      // Aplicar paginação e ordenação
      query = query
        .order('created_at', { ascending: false })
        .range(from, to)

      const { data: leads, error } = await query

      if (error) throw error
      const totalPages = Math.ceil(totalCount / pageSize)

      // Enriquecer com grupos ativos por lead
      const leadIds = (leads || []).map((l: any) => l.id)
      let groupsByLead: Record<string, any[]> = {}
      if (leadIds.length) {
        const { data: groups } = await supabase
          .from('lead_group_memberships')
          .select('lead_id, group_jid, group_name, is_active')
          .in('lead_id', leadIds)
        const activeGroups = (groups || []).filter((g: any) => g.is_active)
        for (const g of activeGroups) {
          groupsByLead[g.lead_id] = groupsByLead[g.lead_id] || []
          groupsByLead[g.lead_id].push({ group_jid: g.group_jid, group_name: g.group_name })
        }
      }

      const enriched = (leads || []).map((l: any) => ({ ...l, groups_active: groupsByLead[l.id] || [] }))

      return {
        data: enriched,
        count: totalCount,
        totalPages,
        currentPage: page,
        pageSize,
        from: from + 1,
        to: Math.min(to + 1, totalCount)
      }
    },
    staleTime: 30000, // Cache por 30 segundos
  })

  const createLead = useMutation({
    mutationFn: async (lead: TablesInsert<'leads'>) => {
      const { data, error } = await supabase
        .from('leads')
        .insert(lead)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const updateLead = useMutation({
    mutationFn: async ({ id, ...updates }: TablesUpdate<'leads'> & { id: string }) => {
      const { data, error } = await supabase
        .from('leads')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      
      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  const deleteLead = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] })
    },
  })

  return {
    leads: data?.data,
    totalCount: data?.count || 0,
    totalPages: data?.totalPages || 0,
    currentPage: data?.currentPage || 1,
    pageSize: data?.pageSize || pageSize,
    from: data?.from || 0,
    to: data?.to || 0,
    isLoading,
    isFetching,
    error,
    createLead,
    updateLead,
    deleteLead,
  }
}