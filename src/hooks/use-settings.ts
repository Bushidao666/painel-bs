'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsService, type Setting } from '@/lib/services/settings'
import { toast } from 'sonner'

export function useSettings(category?: string) {
  const queryClient = useQueryClient()

  const { data: settings, isLoading, error } = useQuery({
    queryKey: category ? ['settings', category] : ['settings'],
    queryFn: async () => {
      if (category) {
        return settingsService.getSettingsByCategory(category)
      }
      return settingsService.getAllSettings()
    },
  })

  const updateSetting = useMutation({
    mutationFn: async ({ key, value }: { key: string; value: string }) => {
      return settingsService.updateSetting(key, value)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configuração salva com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro ao salvar configuração'
      toast.error(errorMessage)
      console.error('Erro ao salvar configuração:', {
        error,
        message: errorMessage,
        stack: error?.stack
      })
    },
  })

  const updateMultiple = useMutation({
    mutationFn: async (settings: { key: string; value: string }[]) => {
      return settingsService.updateMultipleSettings(settings)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configurações salvas com sucesso')
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro ao salvar configurações'
      toast.error(errorMessage)
      console.error('Erro ao salvar configurações:', {
        error,
        message: errorMessage,
        stack: error?.stack
      })
    },
  })

  const testEvolution = useMutation({
    mutationFn: async ({ url, apiKey }: { url: string; apiKey: string }) => {
      return settingsService.testEvolutionConnection(url, apiKey)
    },
  })

  const testMailchimp = useMutation({
    mutationFn: async ({ apiKey, server }: { apiKey: string; server: string }) => {
      return settingsService.testMailchimpConnection(apiKey, server)
    },
  })

  const resetToDefaults = useMutation({
    mutationFn: async (category?: string) => {
      return settingsService.resetToDefaults(category)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] })
      toast.success('Configurações restauradas para padrão')
    },
    onError: (error: any) => {
      const errorMessage = error?.message || 'Erro ao restaurar configurações'
      toast.error(errorMessage)
      console.error('Erro ao restaurar configurações:', {
        error,
        message: errorMessage,
        stack: error?.stack
      })
    },
  })

  // Organizar configurações por categoria
  const settingsByCategory = settings?.reduce((acc, setting) => {
    if (!acc[setting.category]) {
      acc[setting.category] = []
    }
    acc[setting.category].push(setting)
    return acc
  }, {} as Record<string, Setting[]>)

  // Helper para pegar valor de uma configuração específica
  const getSettingValue = (key: string): string | null => {
    const setting = settings?.find(s => s.key === key)
    return setting?.value || null
  }

  return {
    settings,
    settingsByCategory,
    isLoading,
    error,
    updateSetting,
    updateMultiple,
    testEvolution,
    testMailchimp,
    resetToDefaults,
    getSettingValue,
  }
}

// Hook específico para configurações de API
export function useAPISettings() {
  const { settings, updateSetting, testEvolution, testMailchimp, isLoading } = useSettings()

  const evolutionSettings = settings?.filter(s => s.category === 'evolution') || []
  const mailchimpSettings = settings?.filter(s => s.category === 'mailchimp') || []

  return {
    evolutionSettings,
    mailchimpSettings,
    updateSetting,
    testEvolution,
    testMailchimp,
    isLoading,
  }
}

// Hook específico para configurações de scoring
export function useScoringSettings() {
  const { settings, updateSetting, resetToDefaults, isLoading } = useSettings('scoring')

  const scoringValues = settings?.reduce((acc, setting) => {
    acc[setting.key] = Number(setting.value) || 0
    return acc
  }, {} as Record<string, number>)

  return {
    settings,
    scoringValues,
    updateSetting,
    resetToDefaults,
    isLoading,
  }
}