'use client'

import { useMemo, useState, useEffect } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { QRCodeModal } from '@/components/connections/qr-code-modal'
import { GroupsSelector } from '@/components/connections/groups-selector'
import { useWhatsAppConnection, useWhatsAppGroups } from '@/hooks/use-whatsapp-connection'
import { Wifi, WifiOff, QrCode, RefreshCw, Settings, Users, Activity, Link as LinkIcon, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface InstanceDetailDrawerProps {
  open: boolean
  onClose: () => void
  instance: any | null
  defaultTab?: 'overview' | 'groups' | 'activity' | 'settings'
}

export function InstanceDetailDrawer({ open, onClose, instance, defaultTab = 'overview' }: InstanceDetailDrawerProps) {
  const [tab, setTab] = useState(defaultTab)
  const [showQR, setShowQR] = useState(false)
  const name = instance?.instance_name as string | undefined

  const { qrCode, isConnecting, connectionStatus, connect, disconnect } = useWhatsAppConnection(name || '')
  const { groups, isLoading, syncGroups, toggleLaunchGroup } = useWhatsAppGroups(instance?.id || '')
  const [identifying, setIdentifying] = useState(false)
  const [identifySummary, setIdentifySummary] = useState<{
    total: number
    perGroup: { name: string; updated: number }[]
  } | null>(null)

  // Auto-sync ao abrir aba de grupos e a cada 10 min
  useEffect(() => {
    if (tab === 'groups' && instance?.id) {
      syncGroups.mutate()
      const t = setInterval(() => syncGroups.mutate(), 10 * 60 * 1000)
      return () => clearInterval(t)
    }
  }, [tab, instance?.id])

  const statusBadge = useMemo(() => {
    switch (connectionStatus) {
      case 'connected':
        return <Badge className="bg-green-500">Conectado</Badge>
      case 'connecting':
        return <Badge className="bg-yellow-500">Conectando...</Badge>
      case 'qr_code':
        return <Badge className="bg-blue-500">Aguardando QR Code</Badge>
      default:
        return <Badge variant="secondary">Desconectado</Badge>
    }
  }, [connectionStatus])

  const webhookUrl = useMemo(() => {
    const supabaseUrl = process?.env?.NEXT_PUBLIC_SUPABASE_URL || 'https://hhagsydidweninjvbeae.supabase.co'
    return `${supabaseUrl}/functions/v1/evolution-webhook`
  }, [])

  const reconfigureWebhook = async () => {
    if (!name) return
    await fetch('/api/whatsapp/instances', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ instanceName: name })
    })
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose() }}>
      <SheetContent className="w-full max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Instância: {name}</SheetTitle>
          <SheetDescription>Gerencie a conexão, grupos e configurações desta instância.</SheetDescription>
        </SheetHeader>

        <div className="mt-4">
          <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
            <TabsList className="w-full overflow-x-auto whitespace-nowrap">
              <TabsTrigger value="overview"><Wifi className="h-4 w-4 mr-2" />Visão Geral</TabsTrigger>
              <TabsTrigger value="groups"><Users className="h-4 w-4 mr-2" />Grupos</TabsTrigger>
              <TabsTrigger value="activity"><Activity className="h-4 w-4 mr-2" />Atividade</TabsTrigger>
              <TabsTrigger value="settings"><Settings className="h-4 w-4 mr-2" />Configurações</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <Card className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {statusBadge}
                    <div className="text-sm text-zinc-500">{instance?.phone_number || 'Sem número'}</div>
                  </div>
                  <div className="flex gap-2">
                    {connectionStatus === 'connected' ? (
                      <Button variant="outline" onClick={disconnect}><WifiOff className="h-4 w-4 mr-2" />Desconectar</Button>
                    ) : (
                      <Button onClick={async () => { const r = await connect(); if (r?.qrGenerated) setShowQR(true) }} disabled={isConnecting}>
                        <QrCode className="h-4 w-4 mr-2" />{isConnecting ? 'Conectando...' : 'Conectar'}
                      </Button>
                    )}
                    <Button variant="outline" onClick={() => setShowQR(true)} disabled={!qrCode && connectionStatus !== 'qr_code'}>
                      <QrCode className="h-4 w-4 mr-2" />Mostrar QR
                    </Button>
                    <Button variant="ghost" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4 mr-2" />Atualizar</Button>
                  </div>
                </div>
              </Card>
            </TabsContent>

            <TabsContent value="groups" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="text-sm text-zinc-600">Grupos sincronizam automaticamente em segundo plano. Marque quais são de lançamento.</div>
                <div className="flex gap-2">
                  <Button
                    onClick={async () => {
                      if (!instance?.id) return
                      try {
                        setIdentifying(true)
                        const resp = await fetch('/api/whatsapp/groups/check-members', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ instanceId: instance.id })
                        })
                        const data = await resp.json()
                        if (!resp.ok) throw new Error(data?.error || 'Falha ao identificar')
                        const perGroup = (data.details || []).map((d: any) => ({
                          name: d.groupName || d.groupJid,
                          updated: d.updated || 0
                        }))
                        setIdentifySummary({ total: data.leadsUpdated || 0, perGroup })
                        toast.success(`Leads atualizados: ${data.leadsUpdated || 0}`)
                      } catch (e: any) {
                        toast.error(e?.message || 'Erro ao identificar')
                      } finally {
                        setIdentifying(false)
                      }
                    }}
                    disabled={identifying}
                  >
                    {identifying ? 'Identificando...' : 'Identificar Leads'}
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-20 rounded border bg-white animate-pulse" />
                  ))}
                </div>
              ) : (
                <>
                  <GroupsSelector
                    groups={groups || []}
                    isLoading={false}
                    onToggleLaunchGroup={(groupId, isLaunchGroup) => toggleLaunchGroup.mutate({ groupId, isLaunchGroup })}
                    onSync={() => {}}
                    isSyncing={false}
                  />
                  {!groups?.length && (
                    <div className="text-sm text-zinc-500">Nenhum grupo encontrado ainda. A sincronização está rodando em segundo plano...</div>
                  )}
                </>
              )}

              {identifySummary && (
                <Card className="p-4">
                  <div className="text-sm">Leads atualizados: <span className="font-semibold">{identifySummary.total}</span></div>
                  <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {identifySummary.perGroup.map((g, idx) => (
                      <div key={idx} className="text-sm text-zinc-600 p-2 rounded border">
                        {g.name}: {g.updated}
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="activity">
              <Card className="p-6 text-sm text-zinc-600">Atividade recente estará disponível em breve.</Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4">
              <Card className="p-4 space-y-3">
                <div className="font-medium">Webhook</div>
                <div className="flex items-center justify-between">
                  <div className="text-sm text-zinc-600 truncate">{webhookUrl}</div>
                  <Button variant="outline" onClick={reconfigureWebhook}><LinkIcon className="h-4 w-4 mr-2" />Reconfigurar</Button>
                </div>
              </Card>
              <Card className="p-4 space-y-3">
                <div className="font-medium text-red-600">Zona de Perigo</div>
                <Button variant="destructive" disabled><Trash2 className="h-4 w-4 mr-2" />Excluir instância</Button>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <QRCodeModal
          isOpen={showQR}
          onClose={() => setShowQR(false)}
          instanceName={name || ''}
          qrCode={qrCode}
          isLoading={isConnecting}
          onRefresh={connect}
        />
      </SheetContent>
    </Sheet>
  )
}


