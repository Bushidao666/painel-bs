'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Plus, Calendar, Target, Users, Settings, Zap, TrendingUp, Edit2, Trash2, ExternalLink } from 'lucide-react'
import { useCampaigns } from '@/hooks/use-campaigns'
import { 
  useScoringRules, 
  useCreateScoringRule, 
  useUpdateScoringRule, 
  useDeleteScoringRule,
  useToggleScoringRule,
  type ScoringRule 
} from '@/hooks/use-scoring-rules'
import { ScoringRuleEditor } from '@/components/campaigns/scoring-rule-editor'
import { ScoringPreview } from '@/components/campaigns/scoring-preview'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import Link from 'next/link'

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns()
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editingRule, setEditingRule] = useState<ScoringRule | null>(null)
  
  // Hooks para regras de scoring
  const { data: scoringRules, isLoading: rulesLoading } = useScoringRules(selectedCampaign || undefined)
  const createRule = useCreateScoringRule()
  const updateRule = useUpdateScoringRule()
  const deleteRule = useDeleteScoringRule()
  const toggleRule = useToggleScoringRule()

  const handleSyncCampaign = async (campaignId: string) => {
    toast.info('Sincronizando campanha...')
    try {
      const response = await fetch(`/api/sync/campaign/${campaignId}`, { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        toast.success(`Campanha sincronizada! ${data.syncedSuccessfully} leads atualizados`)
      }
    } catch (error) {
      toast.error('Erro ao sincronizar campanha')
    }
  }

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'ativa':
        return <Badge className="bg-green-500">Ativa</Badge>
      case 'planejada':
        return <Badge className="bg-blue-500">Planejada</Badge>
      case 'pausada':
        return <Badge className="bg-yellow-500">Pausada</Badge>
      case 'concluida':
        return <Badge variant="secondary">Concluída</Badge>
      default:
        return <Badge variant="outline">Indefinido</Badge>
    }
  }

  const handleSaveRule = async (ruleData: Omit<ScoringRule, 'id' | 'created_at' | 'updated_at'>) => {
    if (editingRule) {
      await updateRule.mutateAsync({ id: editingRule.id, ...ruleData })
    } else {
      await createRule.mutateAsync(ruleData)
    }
    setEditingRule(null)
  }

  const handleEditRule = (rule: ScoringRule) => {
    setEditingRule(rule)
    setEditorOpen(true)
  }

  const handleDeleteRule = async (id: string) => {
    if (confirm('Tem certeza que deseja remover esta regra?')) {
      await deleteRule.mutateAsync(id)
    }
  }

  const handleToggleRule = async (id: string, ativo: boolean) => {
    await toggleRule.mutateAsync({ id, ativo })
  }

  if (isLoading) {
    return <div>Carregando campanhas...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Campanhas</h1>
          <p className="text-zinc-500">Gerencie suas campanhas e regras de scoring</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Nova Campanha
        </Button>
      </div>

      <Tabs defaultValue="campaigns" className="space-y-4">
        <TabsList>
          <TabsTrigger value="campaigns">Campanhas</TabsTrigger>
          <TabsTrigger value="scoring">Regras de Scoring</TabsTrigger>
          <TabsTrigger value="automations">Automações</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {campaigns?.map((campaign) => (
              <Card key={campaign.id} className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-semibold">{campaign.nome}</h3>
                    <p className="text-sm text-zinc-500 mt-1">
                      {campaign.descricao || 'Sem descrição'}
                    </p>
                  </div>
                  {getStatusBadge(campaign.status)}
                </div>
                
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-zinc-400" />
                    <span>
                      {format(new Date(campaign.data_lancamento), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-zinc-400" />
                    <span>Meta: {campaign.meta_leads || 0} leads</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <Button size="sm" variant="outline" className="flex-1">
                    <Users className="h-4 w-4 mr-1" />
                    Ver Leads
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="flex-1"
                    onClick={() => handleSyncCampaign(campaign.id)}
                  >
                    <Zap className="h-4 w-4 mr-1" />
                    Sincronizar
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="scoring" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <Card className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-lg font-semibold">Regras de Pontuação</h3>
                    <p className="text-sm text-muted-foreground">
                      Gerencie as regras que calculam o score dos leads
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Link href="/settings?tab=scoring">
                      <Button size="sm" variant="outline">
                        <Settings className="h-4 w-4 mr-2" />
                        Configurações
                      </Button>
                    </Link>
                    <Button 
                      size="sm"
                      onClick={() => {
                        setEditingRule(null)
                        setEditorOpen(true)
                      }}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Nova Regra
                    </Button>
                  </div>
                </div>

                {rulesLoading ? (
                  <div className="text-center py-8">Carregando regras...</div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Regra</TableHead>
                        <TableHead>Evento</TableHead>
                        <TableHead>Pontos</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-[120px]">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {scoringRules?.map((rule) => (
                        <TableRow key={rule.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">{rule.nome}</div>
                              {rule.descricao && (
                                <div className="text-xs text-muted-foreground">
                                  {rule.descricao}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-xs bg-zinc-100 px-2 py-1 rounded">
                              {rule.condicao.event_type || 'custom'}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{rule.pontos}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {rule.tipo}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={rule.ativo}
                              onCheckedChange={(checked) => 
                                handleToggleRule(rule.id, checked)
                              }
                            />
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleEditRule(rule)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={() => handleDeleteRule(rule.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!scoringRules || scoringRules.length === 0) && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                            Nenhuma regra de scoring cadastrada
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </div>

            {/* Preview do Scoring */}
            <div>
              <ScoringPreview rules={scoringRules || []} />
            </div>
          </div>

        </TabsContent>

        <TabsContent value="automations" className="space-y-4">
          <Card className="p-6">
            <h3 className="text-lg font-semibold mb-4">Automações Baseadas em Score</h3>
            
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Lead fica Quente (Score &gt; 70)</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      Enviar notificação para vendedor e adicionar ao grupo VIP
                    </p>
                  </div>
                  <Badge className="bg-green-500">Ativa</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">3+ Emails Abertos</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      Enviar oferta especial via WhatsApp
                    </p>
                  </div>
                  <Badge className="bg-green-500">Ativa</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Entrou no Grupo de Lançamento</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      Iniciar sequência de boas-vindas e aquecimento
                    </p>
                  </div>
                  <Badge className="bg-green-500">Ativa</Badge>
                </div>
              </div>

              <div className="p-4 border rounded-lg opacity-50">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="font-medium">Lead Inativo há 7 dias</h4>
                    <p className="text-sm text-zinc-500 mt-1">
                      Enviar sequência de reativação
                    </p>
                  </div>
                  <Badge variant="secondary">Inativa</Badge>
                </div>
              </div>
            </div>

            <Button className="w-full mt-4">
              <Plus className="h-4 w-4 mr-2" />
              Criar Nova Automação
            </Button>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modal de Edição de Regra */}
      <ScoringRuleEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        rule={editingRule}
        onSave={handleSaveRule}
        campaignId={selectedCampaign || undefined}
      />
    </div>
  )
}