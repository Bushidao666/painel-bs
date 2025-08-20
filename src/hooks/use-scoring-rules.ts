'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export interface ScoringRule {
  id: string
  nome: string
  descricao: string | null
  condicao: Record<string, any>
  pontos: number
  tipo: 'comportamental' | 'demografico' | 'engajamento'
  ativo: boolean
  campaign_id?: string | null
  created_at: string
  updated_at: string
}

export function useScoringRules(campaignId?: string) {
  const supabase = createClient()

  return useQuery({
    queryKey: ['scoring-rules', campaignId],
    queryFn: async () => {
      let query = supabase
        .from('scoring_rules')
        .select('*')
        .order('nome', { ascending: true })

      // Filtrar por campanha se fornecido
      if (campaignId) {
        query = query.or(`campaign_id.eq.${campaignId},campaign_id.is.null`)
      }

      const { data, error } = await query

      if (error) throw error
      return data as ScoringRule[]
    },
  })
}

export function useCreateScoringRule() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (rule: Omit<ScoringRule, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('scoring_rules')
        .insert(rule)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] })
      toast.success('Regra de scoring criada com sucesso!')
    },
    onError: (error) => {
      toast.error('Erro ao criar regra de scoring')
      console.error(error)
    },
  })
}

export function useUpdateScoringRule() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<ScoringRule> & { id: string }) => {
      const { data, error } = await supabase
        .from('scoring_rules')
        .update(updates)
        .eq('id', id)
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] })
      toast.success('Regra atualizada com sucesso!')
    },
    onError: (error) => {
      toast.error('Erro ao atualizar regra')
      console.error(error)
    },
  })
}

export function useDeleteScoringRule() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('scoring_rules')
        .delete()
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] })
      toast.success('Regra removida com sucesso!')
    },
    onError: (error) => {
      toast.error('Erro ao remover regra')
      console.error(error)
    },
  })
}

export function useToggleScoringRule() {
  const queryClient = useQueryClient()
  const supabase = createClient()

  return useMutation({
    mutationFn: async ({ id, ativo }: { id: string; ativo: boolean }) => {
      const { error } = await supabase
        .from('scoring_rules')
        .update({ ativo })
        .eq('id', id)

      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['scoring-rules'] })
      toast.success(`Regra ${variables.ativo ? 'ativada' : 'desativada'}!`)
    },
    onError: (error) => {
      toast.error('Erro ao alterar status da regra')
      console.error(error)
    },
  })
}