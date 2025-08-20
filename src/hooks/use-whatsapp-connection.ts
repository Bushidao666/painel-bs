'use client'

import { useState, useEffect, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { RealtimeChannel } from '@supabase/supabase-js'

interface WhatsAppInstance {
  id: string
  instance_name: string
  phone_number: string | null
  status: 'connected' | 'disconnected' | 'connecting' | 'qr_code'
  qr_code: string | null
  qr_code_expires_at: string | null
  connected_at: string | null
  last_sync: string | null
  metadata: any
  created_at: string
  updated_at: string
}

interface LaunchGroup {
  id: string
  instance_id: string
  group_jid: string
  group_name: string
  group_description: string | null
  participant_count: number
  is_active: boolean
  is_launch_group: boolean
  metadata: any
}

export function useWhatsAppInstances() {
  const supabase = createClient()
  const queryClient = useQueryClient()
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)

  // Query para buscar instâncias
  const { data: instances, isLoading, error } = useQuery({
    queryKey: ['whatsapp-instances'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      return data as WhatsAppInstance[]
    }
  })

  // Configurar Realtime subscription
  useEffect(() => {
    // Criar canal de realtime
    const channel = supabase
      .channel('whatsapp-instances-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // Escutar INSERT, UPDATE e DELETE
          schema: 'public',
          table: 'whatsapp_instances'
        },
        (payload) => {
          console.log('Mudança detectada na tabela whatsapp_instances:', payload)
          
          // Invalidar query para recarregar dados
          queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
          
          // Mostrar notificação baseada no evento
          if (payload.eventType === 'UPDATE') {
            const newInstance = payload.new as WhatsAppInstance
            const oldInstance = payload.old as WhatsAppInstance
            
            // Notificar mudanças de status importantes
            if (newInstance.status !== oldInstance.status) {
              if (newInstance.status === 'connected') {
                toast.success(`WhatsApp ${newInstance.instance_name} conectado!`)
              } else if (newInstance.status === 'disconnected' && oldInstance.status === 'connected') {
                toast.warning(`WhatsApp ${newInstance.instance_name} desconectado`)
              }
            }
          }
        }
      )
      .subscribe()

    setRealtimeChannel(channel)

    // Cleanup na desmontagem
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [supabase, queryClient])

  const createInstance = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await fetch('/api/whatsapp/instances', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceName })
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao criar instância')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      toast.success('Instância criada com sucesso')
    },
    onError: (error: any) => {
      toast.error(error.message || 'Erro ao criar instância')
    }
  })

  const deleteInstance = useMutation({
    mutationFn: async (instanceName: string) => {
      const response = await fetch(`/api/whatsapp/instances/${instanceName}`, {
        method: 'DELETE'
      })
      
      if (!response.ok) throw new Error('Erro ao deletar instância')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      toast.success('Instância removida')
    },
    onError: () => {
      toast.error('Erro ao remover instância')
    }
  })

  return {
    instances,
    isLoading,
    error,
    createInstance,
    deleteInstance
  }
}

export function useWhatsAppConnection(instanceName: string) {
  const [qrCode, setQrCode] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting' | 'qr_code'>('disconnected')
  const queryClient = useQueryClient()
  const supabase = createClient()
  const [realtimeChannel, setRealtimeChannel] = useState<RealtimeChannel | null>(null)

  // Buscar status inicial da instância
  useEffect(() => {
    const fetchInstanceStatus = async () => {
      const { data } = await supabase
        .from('whatsapp_instances')
        .select('status, qr_code')
        .eq('instance_name', instanceName)
        .single()
      
      if (data) {
        setConnectionStatus(data.status as any)
        if (data.qr_code) {
          setQrCode(data.qr_code)
        }
      }
    }
    
    fetchInstanceStatus()
  }, [instanceName, supabase])

  // Configurar Realtime subscription para esta instância específica
  useEffect(() => {
    // Criar canal de realtime para mudanças desta instância
    const channel = supabase
      .channel(`whatsapp-instance-${instanceName}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'whatsapp_instances',
          filter: `instance_name=eq.${instanceName}`
        },
        (payload) => {
          console.log(`Status atualizado para ${instanceName}:`, payload)
          
          const newData = payload.new as WhatsAppInstance
          
          // Atualizar status local
          setConnectionStatus(newData.status as any)
          
          // Atualizar QR Code se disponível
          if (newData.qr_code) {
            setQrCode(newData.qr_code)
          } else {
            setQrCode(null)
          }
          
          // Se conectou com sucesso
          if (newData.status === 'connected' && connectionStatus !== 'connected') {
            setIsConnecting(false)
            toast.success('WhatsApp conectado com sucesso!')
            queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
          }
          
          // Se desconectou
          if (newData.status === 'disconnected' && connectionStatus === 'connected') {
            toast.warning('WhatsApp desconectado')
          }
        }
      )
      .subscribe()

    setRealtimeChannel(channel)

    // Cleanup
    return () => {
      if (channel) {
        supabase.removeChannel(channel)
      }
    }
  }, [instanceName, supabase, queryClient, connectionStatus])

  const connect = useCallback(async (): Promise<{ qrGenerated: boolean; alreadyConnected?: boolean }> => {
    setIsConnecting(true)
    try {
      const response = await fetch(`/api/whatsapp/connect/${instanceName}`, {
        method: 'POST'
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erro ao conectar')
      }
      
      const data = await response.json()
      
      if (data.alreadyConnected) {
        setConnectionStatus('connected')
        setQrCode(null)
        toast.success('Instância já está conectada')
        return { qrGenerated: false, alreadyConnected: true }
      }

      if (data.qrCode) {
        setQrCode(data.qrCode)
        setConnectionStatus('qr_code')
        toast.info('QR Code gerado. Escaneie com seu WhatsApp')
        return { qrGenerated: true }
      } else {
        throw new Error('QR Code não foi gerado. Tente novamente.')
      }
    } catch (error: any) {
      console.error('Erro ao gerar QR Code:', error)
      toast.error(error.message || 'Erro ao gerar QR Code')
      setQrCode(null)
      return { qrGenerated: false }
    } finally {
      // SEMPRE desativa o loading, mesmo em caso de erro
      setIsConnecting(false)
    }
  }, [instanceName])

  const disconnect = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/connect/${instanceName}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setConnectionStatus('disconnected')
        setQrCode(null)
        toast.success('Desconectado com sucesso')
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      }
    } catch (error) {
      toast.error('Erro ao desconectar')
    }
  }, [instanceName, queryClient])

  // Verificação manual de status via Evolution (via rota server-side)
  const checkStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/whatsapp/connect/${instanceName}/status`, { method: 'GET' })
      if (!response.ok) return
      const data = await response.json()
      if (data?.status) setConnectionStatus(data.status)
      if (data?.phoneNumber) {
        // Atualizar phone number no banco via Realtime normalmente, mas se vier na resposta, atualiza localmente também
        // Como não temos o phone_number no estado deste hook, a UI do card usa o valor da query das instâncias
        // Portanto, invalidamos a query para refletir o número mostrado
        queryClient.invalidateQueries({ queryKey: ['whatsapp-instances'] })
      }
    } catch {
      // silencioso
    }
  }, [instanceName, queryClient])

  // Remover polling - agora usa Realtime
  // useEffect removido para polling

  // Auto-refresh do QR Code a cada 30 segundos
  useEffect(() => {
    if (connectionStatus === 'qr_code' && qrCode) {
      const timer = setTimeout(() => {
        toast.warning('QR Code expirado. Gerando novo...')
        connect()
      }, 30000)
      
      return () => clearTimeout(timer)
    }
  }, [qrCode, connectionStatus, connect])

  // Polling leve do status até conectar (fallback ao Realtime)
  useEffect(() => {
    if (connectionStatus !== 'connected') {
      const interval = setInterval(() => {
        checkStatus()
      }, 4000)
      return () => clearInterval(interval)
    }
  }, [connectionStatus, checkStatus])

  return {
    qrCode,
    isConnecting,
    connectionStatus,
    connect,
    disconnect,
    checkStatus
  }
}

export function useWhatsAppGroups(instanceId: string) {
  const supabase = createClient()
  const queryClient = useQueryClient()

  const { data: groups, isLoading, error } = useQuery({
    queryKey: ['whatsapp-groups', instanceId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('launch_groups')
        .select('*')
        .eq('instance_id', instanceId)
        .order('group_name')
      
      if (error) throw error
      return data as LaunchGroup[]
    },
    enabled: !!instanceId
  })

  const syncGroups = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/whatsapp/groups/sync/${instanceId}`, {
        method: 'POST'
      })
      
      if (!response.ok) throw new Error('Erro ao sincronizar grupos')
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups', instanceId] })
      toast.success(`${data.groupsCount} grupos sincronizados`)
    },
    onError: () => {
      toast.error('Erro ao sincronizar grupos')
    }
  })

  const toggleLaunchGroup = useMutation({
    mutationFn: async ({ groupId, isLaunchGroup }: { groupId: string, isLaunchGroup: boolean }) => {
      const { error } = await supabase
        .from('launch_groups')
        .update({ is_launch_group: isLaunchGroup })
        .eq('id', groupId)
      
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-groups', instanceId] })
      toast.success('Grupo atualizado')
    },
    onError: () => {
      toast.error('Erro ao atualizar grupo')
    }
  })

  return {
    groups,
    isLoading,
    error,
    syncGroups,
    toggleLaunchGroup
  }
}