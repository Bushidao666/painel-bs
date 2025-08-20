'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { RefreshCw, Check, AlertCircle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'

interface SyncStatusProps {
  onSync?: () => void
}

export function SyncStatus({ onSync }: SyncStatusProps) {
  const [syncStatus, setSyncStatus] = useState<any>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const fetchSyncStatus = async () => {
    try {
      const response = await fetch('/api/sync/all')
      const data = await response.json()
      setSyncStatus(data)
    } catch (error) {
      console.error('Erro ao buscar status de sincronização:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchSyncStatus()
    // Atualizar a cada minuto
    const interval = setInterval(fetchSyncStatus, 60000)
    return () => clearInterval(interval)
  }, [])

  const handleSync = async () => {
    setIsSyncing(true)
    toast.info('Iniciando sincronização...')
    
    try {
      const response = await fetch('/api/sync/all', { method: 'POST' })
      const data = await response.json()
      
      if (data.success) {
        toast.success(`Sincronização concluída! ${data.syncedSuccessfully} leads atualizados`)
        fetchSyncStatus()
      } else {
        toast.error('Erro na sincronização')
      }
    } catch (error) {
      toast.error('Erro ao sincronizar')
    } finally {
      setIsSyncing(false)
      onSync?.()
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success':
        return <Badge className="bg-green-500"><Check className="h-3 w-3 mr-1" />Sucesso</Badge>
      case 'partial':
        return <Badge className="bg-yellow-500"><AlertCircle className="h-3 w-3 mr-1" />Parcial</Badge>
      case 'error':
        return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Erro</Badge>
      default:
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Pendente</Badge>
    }
  }

  if (isLoading) {
    return (
      <Card className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-zinc-200 rounded w-1/2 mb-2"></div>
          <div className="h-3 bg-zinc-200 rounded w-1/3"></div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium flex items-center gap-2">
            Status de Sincronização
            {syncStatus?.lastSync && getStatusBadge(syncStatus.lastSync.status)}
          </h3>
          {syncStatus?.lastSync && (
            <p className="text-xs text-zinc-500 mt-1">
              Última sincronização{' '}
              {formatDistanceToNow(new Date(syncStatus.lastSync.created_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </p>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          onClick={handleSync}
          disabled={isSyncing}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
          {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
        </Button>
      </div>

      {syncStatus?.stats && syncStatus.stats.length > 0 && (
        <div className="mt-4 space-y-2 border-t pt-3">
          {syncStatus.stats.map((stat: any) => (
            <div key={stat.service} className="flex items-center justify-between text-xs">
              <span className="text-zinc-600 capitalize">{stat.service}</span>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500">{stat.leads_synced} leads</span>
                {getStatusBadge(stat.status)}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}