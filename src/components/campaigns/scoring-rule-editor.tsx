'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Loader2 } from 'lucide-react'
import { ScoringRule } from '@/hooks/use-scoring-rules'

interface ScoringRuleEditorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rule?: ScoringRule | null
  onSave: (rule: Omit<ScoringRule, 'id' | 'created_at' | 'updated_at'>) => Promise<void>
  campaignId?: string
}

const EVENT_TYPES = [
  { value: 'email_open', label: 'Email Aberto' },
  { value: 'email_click', label: 'Clique em Link' },
  { value: 'email_multiple_opens', label: 'Múltiplas Aberturas' },
  { value: 'whatsapp_read', label: 'Mensagem Lida (WhatsApp)' },
  { value: 'whatsapp_reply', label: 'Respondeu Mensagem' },
  { value: 'whatsapp_group_read', label: 'Mensagem no Grupo Lida' },
  { value: 'group_join', label: 'Entrou no Grupo' },
  { value: 'landing_page_visit', label: 'Visitou Landing Page' },
  { value: 'webinar_attendance', label: 'Participou do Webinar' },
  { value: 'video_watch', label: 'Assistiu Vídeo' },
]

export function ScoringRuleEditor({
  open,
  onOpenChange,
  rule,
  onSave,
  campaignId,
}: ScoringRuleEditorProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    event_type: 'email_open',
    pontos: 10,
    tipo: 'engajamento' as 'comportamental' | 'demografico' | 'engajamento',
    ativo: true,
    campaign_id: campaignId || null,
  })

  useEffect(() => {
    if (rule) {
      setFormData({
        nome: rule.nome,
        descricao: rule.descricao || '',
        event_type: rule.condicao.event_type || 'email_open',
        pontos: rule.pontos,
        tipo: rule.tipo,
        ativo: rule.ativo,
        campaign_id: rule.campaign_id || campaignId || null,
      })
    } else {
      setFormData({
        nome: '',
        descricao: '',
        event_type: 'email_open',
        pontos: 10,
        tipo: 'engajamento',
        ativo: true,
        campaign_id: campaignId || null,
      })
    }
  }, [rule, campaignId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await onSave({
        nome: formData.nome,
        descricao: formData.descricao || null,
        condicao: { event_type: formData.event_type },
        pontos: formData.pontos,
        tipo: formData.tipo,
        ativo: formData.ativo,
        campaign_id: formData.campaign_id,
      })
      onOpenChange(false)
    } catch (error) {
      console.error('Erro ao salvar regra:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>
              {rule ? 'Editar Regra de Scoring' : 'Nova Regra de Scoring'}
            </DialogTitle>
            <DialogDescription>
              Configure os pontos atribuídos para cada ação do lead
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Regra</Label>
              <Input
                id="nome"
                value={formData.nome}
                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                placeholder="Ex: Email Aberto"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição</Label>
              <Textarea
                id="descricao"
                value={formData.descricao}
                onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                placeholder="Descreva quando esta regra é aplicada"
                rows={2}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="event_type">Tipo de Evento</Label>
              <Select
                value={formData.event_type}
                onValueChange={(value) => setFormData({ ...formData, event_type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((event) => (
                    <SelectItem key={event.value} value={event.value}>
                      {event.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="pontos">Pontos</Label>
                <Input
                  id="pontos"
                  type="number"
                  value={formData.pontos}
                  onChange={(e) => setFormData({ ...formData, pontos: Number(e.target.value) })}
                  min={0}
                  max={100}
                  required
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="tipo">Categoria</Label>
                <Select
                  value={formData.tipo}
                  onValueChange={(value: 'comportamental' | 'demografico' | 'engajamento') =>
                    setFormData({ ...formData, tipo: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engajamento">Engajamento</SelectItem>
                    <SelectItem value="comportamental">Comportamental</SelectItem>
                    <SelectItem value="demografico">Demográfico</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="ativo" className="flex items-center gap-2">
                Regra Ativa
              </Label>
              <Switch
                id="ativo"
                checked={formData.ativo}
                onCheckedChange={(checked) => setFormData({ ...formData, ativo: checked })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}