'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Plus, Smartphone, Wifi, Users } from 'lucide-react'
import { InstanceCard } from '@/components/connections/instance-card'
import { QRCodeModal } from '@/components/connections/qr-code-modal'
import { GroupsSelector } from '@/components/connections/groups-selector'
import { Card } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { useWhatsAppInstances, useWhatsAppConnection, useWhatsAppGroups } from '@/hooks/use-whatsapp-connection'
import { toast } from 'sonner'

export default function ConnectionsPage() {
  const { instances, isLoading, createInstance, deleteInstance } = useWhatsAppInstances()
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [newInstanceName, setNewInstanceName] = useState('')
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null)
  const [qrModalInstance, setQrModalInstance] = useState<string | null>(null)
  const [viewingGroups, setViewingGroups] = useState<string | null>(null)
  const [showIdentifyLeads, setShowIdentifyLeads] = useState<{ instanceId: string, instanceName: string } | null>(null)

  const handleCreateInstance = async () => {
    if (!newInstanceName.trim()) {
      toast.error('Nome da instância é obrigatório')
      return
    }

    try {
      await createInstance.mutateAsync(newInstanceName)
      setIsCreateModalOpen(false)
      setNewInstanceName('')
    } catch (error) {
      console.error('Erro ao criar instância:', error)
    }
  }

  const handleDeleteInstance = async (instanceName: string) => {
    if (confirm(`Tem certeza que deseja deletar a instância "${instanceName}"?`)) {
      await deleteInstance.mutateAsync(instanceName)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Smartphone className="h-8 w-8" />
            Conexões WhatsApp
          </h1>
          <p className="text-zinc-500">
            Gerencie suas instâncias e grupos do WhatsApp via Evolution API
          </p>
        </div>
        <Button onClick={() => setIsCreateModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Instância
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-zinc-100 rounded-lg">
              <Smartphone className="h-6 w-6 text-zinc-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Total de Instâncias</p>
              <p className="text-2xl font-bold">{instances?.length || 0}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Wifi className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Conectadas</p>
              <p className="text-2xl font-bold text-green-600">
                {instances?.filter(i => i.status === 'connected').length || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-zinc-500">Grupos de Lançamento</p>
              <p className="text-2xl font-bold text-blue-600">0</p>
            </div>
          </div>
        </div>
      </div>

      {/* Instances Grid */}
      {!viewingGroups ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {instances?.map((instance) => (
            <InstanceWithConnection
              key={instance.id}
              instance={instance}
              onDelete={() => handleDeleteInstance(instance.instance_name)}
              onViewGroups={() => setViewingGroups(instance.id)}
              onIdentifyLeads={() => setShowIdentifyLeads({ instanceId: instance.id, instanceName: instance.instance_name })}
            />
          ))}
          
          {instances?.length === 0 && !isLoading && (
            <div className="col-span-full text-center py-12 bg-white rounded-lg border">
              <Smartphone className="h-12 w-12 text-zinc-300 mx-auto mb-4" />
              <p className="text-zinc-500">Nenhuma instância criada ainda</p>
              <Button 
                className="mt-4"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Criar primeira instância
              </Button>
            </div>
          )}
        </div>
      ) : (
        <GroupsManager
          instanceId={viewingGroups}
          onBack={() => setViewingGroups(null)}
        />
      )}

      {showIdentifyLeads && (
        <IdentifyLeadsPanel
          instanceId={showIdentifyLeads.instanceId}
          instanceName={showIdentifyLeads.instanceName}
          onClose={() => setShowIdentifyLeads(null)}
        />
      )}

      {/* Create Instance Modal */}
      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Criar Nova Instância</DialogTitle>
            <DialogDescription>
              Digite um nome único para identificar esta instância do WhatsApp
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Input
              placeholder="Ex: Vendas, Suporte, Marketing..."
              value={newInstanceName}
              onChange={(e) => setNewInstanceName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateInstance()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleCreateInstance} disabled={createInstance.isPending}>
              {createInstance.isPending ? 'Criando...' : 'Criar Instância'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Componente separado para gerenciar conexão individual
function InstanceWithConnection({ 
  instance, 
  onDelete,
  onViewGroups,
  onIdentifyLeads
}: { 
  instance: any
  onDelete: () => void
  onViewGroups: () => void
  onIdentifyLeads: () => void
}) {
  const [showQRModal, setShowQRModal] = useState(false)
  const { 
    qrCode, 
    isConnecting, 
    connectionStatus, 
    connect, 
    disconnect 
  } = useWhatsAppConnection(instance.instance_name)

  const handleConnect = async () => {
    const result = await connect()
    if (result?.qrGenerated) {
      setShowQRModal(true)
    } else {
      setShowQRModal(false)
    }
  }

  return (
    <>
      <InstanceCard
        instance={instance}
        onConnect={handleConnect}
        onDisconnect={disconnect}
        onDelete={onDelete}
        onViewGroups={onViewGroups}
        isConnecting={isConnecting}
      />
      <div className="mt-2 flex gap-2">
        <Button variant="outline" onClick={onIdentifyLeads}>
          Identificar Leads nos Grupos
        </Button>
      </div>
      
      <QRCodeModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        instanceName={instance.instance_name}
        qrCode={qrCode}
        isLoading={isConnecting}
        onRefresh={connect}
      />
    </>
  )
}

// Componente para gerenciar grupos
function GroupsManager({ 
  instanceId, 
  onBack 
}: { 
  instanceId: string
  onBack: () => void
}) {
  const { groups, isLoading, syncGroups, toggleLaunchGroup } = useWhatsAppGroups(instanceId)

  return (
    <div className="space-y-4">
      <Button variant="outline" onClick={onBack}>
        ← Voltar para Instâncias
      </Button>
      
      <GroupsSelector
        groups={groups || []}
        isLoading={isLoading}
        onToggleLaunchGroup={(groupId, isLaunchGroup) => 
          toggleLaunchGroup.mutate({ groupId, isLaunchGroup })
        }
        onSync={() => syncGroups.mutate()}
        isSyncing={syncGroups.isPending}
      />
    </div>
  )
}

// Painel para identificar leads nos grupos selecionados
function IdentifyLeadsPanel({
  instanceId,
  instanceName,
  onClose
}: {
  instanceId: string
  instanceName: string
  onClose: () => void
}) {
  const { groups } = useWhatsAppGroups(instanceId)
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([])
  const [isRunning, setIsRunning] = useState(false)
  const [result, setResult] = useState<string>('')
  const [summary, setSummary] = useState<{ total: number, perGroup: { name: string, updated: number, leads: { id: string, nome: string | null, whatsapp_number: string | null }[] }[] } | null>(null)

  const toggleSelected = (groupId: string) => {
    setSelectedGroupIds((prev) => 
      prev.includes(groupId) ? prev.filter(id => id !== groupId) : [...prev, groupId]
    )
  }

  const identify = async () => {
    setIsRunning(true)
    setResult('')
    setSummary(null)
    try {
      const response = await fetch('/api/whatsapp/groups/check-members', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ instanceId, groupIds: selectedGroupIds.length ? selectedGroupIds : undefined })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Falha ao identificar leads')
      // Montar resumo legível
      const perGroup = (data.details || []).map((d: any) => {
        const g = (groups || []).find((x: any) => x.group_jid === d.groupJid)
        return {
          name: g?.group_name || d.groupJid,
          updated: d.updated,
          leads: d.leads || []
        }
      })
      setSummary({ total: data.leadsUpdated || 0, perGroup })
      setResult(JSON.stringify(data, null, 2))
    } catch (e: any) {
      setResult(`Erro: ${e.message}`)
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <Card className="p-6 mt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold">Identificar Leads em Grupos — {instanceName}</h3>
          <p className="text-sm text-zinc-500">Selecione os grupos (ou deixe vazio para usar todos os grupos de lançamento) e execute a identificação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onClose}>Fechar</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="p-4">
          <h4 className="font-medium mb-2">Grupos</h4>
          <div className="max-h-72 overflow-y-auto space-y-2">
            {(groups || []).filter((g: any) => g.is_launch_group).map((g) => (
              <label key={g.id} className="flex items-center gap-3 p-2 rounded border hover:bg-zinc-50">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={selectedGroupIds.includes(g.id)}
                  onChange={() => toggleSelected(g.id)}
                />
                <div className="flex-1">
                  <div className="font-medium">{g.group_name}</div>
                  <div className="text-xs text-zinc-500">{g.group_jid}</div>
                </div>
              </label>
            ))}
            {(!groups || groups.length === 0) && (
              <div className="text-sm text-zinc-500">Nenhum grupo. Sincronize para carregar.</div>
            )}
          </div>
          <div className="mt-3">
            <Button onClick={identify} disabled={isRunning} className="w-full">
              {isRunning ? 'Processando...' : 'Identificar Leads'}
            </Button>
          </div>
        </Card>

        <Card className="p-4">
          <h4 className="font-medium mb-2">Resultado</h4>
          {summary ? (
            <div className="space-y-3">
              <div className="text-sm">Leads atualizados: <span className="font-semibold">{summary.total}</span></div>
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {summary.perGroup.map((g, idx) => (
                  <div key={idx} className="p-3 rounded border">
                    <div className="font-medium mb-1">{g.name} — atualizados: {g.updated}</div>
                    {g.leads.length > 0 ? (
                      <ul className="list-disc pl-5 text-sm text-zinc-600 space-y-1">
                        {g.leads.map((l) => (
                          <li key={l.id}>{l.nome || 'Sem nome'} — {l.whatsapp_number || 's/ número'}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-sm text-zinc-500">Nenhum lead encontrado neste grupo.</div>
                    )}
                  </div>
                ))}
              </div>
              <div className="text-xs text-zinc-400">Log bruto:</div>
              <Textarea value={result} readOnly rows={10} className="font-mono text-xs" />
            </div>
          ) : (
            <Textarea value={result} readOnly rows={18} className="font-mono text-xs" />
          )}
        </Card>
      </div>
    </Card>
  )
}