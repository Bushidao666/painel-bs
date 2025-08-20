'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Lead, TablesInsert, TablesUpdate } from '@/lib/types/database'

export function useLeads() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: leads, isLoading, error } = useQuery({
    queryKey: ['leads'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('*, campaigns(nome)')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data
    },
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
    leads,
    isLoading,
    error,
    createLead,
    updateLead,
    deleteLead,
  }
}

export function useLeadById(id: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['leads', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select(`
          *,
          campaigns(nome),
          lead_events(*)
        `)
        .eq('id', id)
        .single()
      
      if (error) throw error
      return data
    },
    enabled: !!id,
  })
}