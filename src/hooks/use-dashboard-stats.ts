'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'

export function useDashboardStats() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const [
        { count: totalLeads },
        { count: hotLeads },
        { data: conversions },
        { data: recentLeads }
      ] = await Promise.all([
        supabase.from('leads').select('*', { count: 'exact', head: true }),
        supabase.from('leads').select('*', { count: 'exact', head: true }).eq('temperatura', 'hot'),
        supabase.from('conversions').select('valor'),
        supabase.from('leads').select('*').order('created_at', { ascending: false }).limit(5)
      ])

      const totalRevenue = conversions?.reduce((sum, c) => sum + (c.valor || 0), 0) || 0
      const conversionRate = totalLeads ? ((conversions?.length || 0) / totalLeads) * 100 : 0

      return {
        totalLeads: totalLeads || 0,
        hotLeads: hotLeads || 0,
        totalRevenue,
        conversionRate,
        recentLeads: recentLeads || []
      }
    },
    refetchInterval: 30000, // Atualiza a cada 30 segundos
  })
}

export function useLeadsByTemperature() {
  const supabase = createClient()

  return useQuery({
    queryKey: ['leads-by-temperature'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('leads')
        .select('temperatura')
      
      if (error) throw error

      const counts = {
        cold: 0,
        warm: 0,
        hot: 0
      }

      data?.forEach(lead => {
        if (lead.temperatura && lead.temperatura in counts) {
          counts[lead.temperatura as keyof typeof counts]++
        }
      })

      return [
        { name: 'Frios', value: counts.cold, color: 'blue' },
        { name: 'Mornos', value: counts.warm, color: 'yellow' },
        { name: 'Quentes', value: counts.hot, color: 'red' }
      ]
    },
  })
}