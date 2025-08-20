'use client'

import { useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

export function useRealtimeLeads() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('leads-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          
          toast.success('Novo lead captado!', {
            description: `${payload.new.nome} acabou de se cadastrar`
          })
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'leads'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['leads'] })
          queryClient.invalidateQueries({ queryKey: ['leads', payload.new.id] })
          
          if (payload.old.temperatura !== payload.new.temperatura && payload.new.temperatura === 'hot') {
            toast('🔥 Lead quente identificado!', {
              description: `${payload.new.nome} está pronto para conversão`
            })
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])
}

export function useRealtimeConversions() {
  const supabase = createClient()
  const queryClient = useQueryClient()

  useEffect(() => {
    const channel = supabase
      .channel('conversions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'conversions'
        },
        (payload) => {
          queryClient.invalidateQueries({ queryKey: ['conversions'] })
          queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] })
          
          toast.success('💰 Nova conversão!', {
            description: `Valor: R$ ${payload.new.valor}`
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, queryClient])
}