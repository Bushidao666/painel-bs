'use client'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Smartphone, 
  Wifi, 
  WifiOff, 
  Loader2, 
  QrCode,
  Trash2,
  Users,
  RefreshCw
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface InstanceCardProps {
  instance: {
    id: string
    instance_name: string
    phone_number: string | null
    status: 'connected' | 'disconnected' | 'connecting' | 'qr_code'
    connected_at: string | null
    last_sync: string | null
  }
  groupsCount?: number
  onConnect: () => void
  onDisconnect: () => void
  onDelete: () => void
  onViewGroups: () => void
  isConnecting?: boolean
}

export function InstanceCard({
  instance,
  groupsCount = 0,
  onConnect,
  onDisconnect,
  onDelete,
  onViewGroups,
  isConnecting = false
}: InstanceCardProps) {
  const getStatusIcon = () => {
    switch (instance.status) {
      case 'connected':
        return <Wifi className="h-5 w-5 text-green-500" />
      case 'disconnected':
        return <WifiOff className="h-5 w-5 text-red-500" />
      case 'connecting':
      case 'qr_code':
        return <Loader2 className="h-5 w-5 text-yellow-500 animate-spin" />
      default:
        return <WifiOff className="h-5 w-5 text-zinc-400" />
    }
  }

  const getStatusBadge = () => {
    switch (instance.status) {
      case 'connected':
        return <Badge className="bg-green-500">Conectado</Badge>
      case 'disconnected':
        return <Badge variant="destructive">Desconectado</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-500">Conectando...</Badge>
      case 'qr_code':
        return <Badge className="bg-blue-500">Aguardando QR Code</Badge>
      default:
        return <Badge variant="secondary">Indefinido</Badge>
    }
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-zinc-600" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{instance.instance_name}</h3>
              {instance.phone_number && (
                <p className="text-sm text-zinc-500">{instance.phone_number}</p>
              )}
            </div>
          </div>
          {getStatusIcon()}
        </div>

        {/* Status */}
        <div className="flex items-center justify-between">
          {getStatusBadge()}
          {instance.connected_at && (
            <span className="text-xs text-zinc-500">
              Conectado {formatDistanceToNow(new Date(instance.connected_at), {
                addSuffix: true,
                locale: ptBR
              })}
            </span>
          )}
        </div>

        {/* Stats */}
        {instance.status === 'connected' && (
          <div className="flex items-center gap-4 p-3 bg-zinc-50 rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-zinc-400" />
              <span className="text-sm">
                <span className="font-medium">{groupsCount}</span> grupos
              </span>
            </div>
            {instance.last_sync && (
              <div className="flex items-center gap-2">
                <RefreshCw className="h-4 w-4 text-zinc-400" />
                <span className="text-sm text-zinc-500">
                  Sincronizado {formatDistanceToNow(new Date(instance.last_sync), {
                    addSuffix: true,
                    locale: ptBR
                  })}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {instance.status === 'disconnected' ? (
            <Button 
              onClick={onConnect}
              disabled={isConnecting}
              className="flex-1"
            >
              {isConnecting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Conectando...
                </>
              ) : (
                <>
                  <QrCode className="h-4 w-4 mr-2" />
                  Conectar
                </>
              )}
            </Button>
          ) : instance.status === 'connected' ? (
            <>
              <Button 
                variant="outline" 
                onClick={onViewGroups}
                className="flex-1"
              >
                <Users className="h-4 w-4 mr-2" />
                Grupos
              </Button>
              <Button 
                variant="outline" 
                onClick={onDisconnect}
                className="flex-1"
              >
                <WifiOff className="h-4 w-4 mr-2" />
                Desconectar
              </Button>
            </>
          ) : (
            <Button disabled className="flex-1">
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Aguardando...
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="icon"
            onClick={onDelete}
            disabled={instance.status !== 'disconnected'}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        </div>
      </div>
    </Card>
  )
}