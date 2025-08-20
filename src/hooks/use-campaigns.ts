'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useCampaigns() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .order('data_lancamento', { ascending: true })
      
      if (error) throw error
      return data
    },
  })
}

export function useActiveCampaign() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['active-campaign'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('campaigns')
        .select('*')
        .eq('status', 'ativa')
        .order('data_lancamento', { ascending: true })
        .limit(1)
        .single()
      
      if (error && error.code !== 'PGRST116') throw error
      return data
    },
  })
}