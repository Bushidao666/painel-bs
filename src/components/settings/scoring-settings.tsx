'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, RotateCcw, TrendingUp, Mail, MessageSquare, Users, Calculator, AlertTriangle, ExternalLink } from 'lucide-react'
import { useScoringSettings } from '@/hooks/use-settings'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

export function ScoringSettings() {
  const {
    settings,
    scoringValues,
    updateSetting,
    resetToDefaults,
    isLoading
  } = useScoringSettings()

  const [localValues, setLocalValues] = useState<Record<string, number>>({})
  const [showRecalcWarning, setShowRecalcWarning] = useState(false)
  const supabase = createClient()

  // Check if recalculation is needed
  const { data: needsRecalc } = useQuery({
    queryKey: ['scoring-recalc-needed'],
    queryFn: async () => {
      const { data } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'SCORE_RECALC_NEEDED')
        .single()
      
      return data?.value === 'true'
    },
    refetchInterval: 30000 // Check every 30 seconds
  })

  // Recalculate all scores mutation
  const recalculateScores = useMutation({
    mutationFn: async (campaignId?: string) => {
      const { data, error } = await supabase
        .rpc('recalculate_all_lead_scores', {
          p_campaign_id: campaignId || null
        })
      
      if (error) throw error
      
      // Clear the recalc flag
      await supabase
        .from('app_settings')
        .update({ value: 'false' })
        .eq('key', 'SCORE_RECALC_NEEDED')
      
      return data
    },
    onSuccess: (data) => {
      if (data && data[0]) {
        const result = data[0]
        toast.success(`Scores recalculados! ${result.updated_leads} leads atualizados em ${result.execution_time_ms}ms`)
      }
      setShowRecalcWarning(false)
    },
    onError: (error) => {
      toast.error('Erro ao recalcular scores')
      console.error(error)
    }
  })

  // Show warning when values change
  useEffect(() => {
    if (Object.keys(localValues).length > 0) {
      setShowRecalcWarning(true)
    }
  }, [localValues])

  // Pegar valores locais ou do banco
  const getValue = (key: string): number => {
    return localValues[key] ?? scoringValues?.[key] ?? 0
  }

  const handleChange = (key: string, value: number) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const updates = Object.entries(localValues).map(([key, value]) => ({
      key,
      value: String(value)
    }))

    for (const update of updates) {
      await updateSetting.mutateAsync(update)
    }

    setLocalValues({})
  }

  const handleReset = async () => {
    if (confirm('Tem certeza que deseja restaurar as configurações padrão?')) {
      await resetToDefaults.mutateAsync(undefined as any)
      setLocalValues({})
    }
  }

  const hasChanges = Object.keys(localValues).length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  // Calcular exemplo de score
  const exampleScore = 
    getValue('SCORE_EMAIL_OPEN') * 2 +
    getValue('SCORE_EMAIL_CLICK') * 1 +
    getValue('SCORE_GROUP_JOIN') * 1 +
    getValue('SCORE_WHATSAPP_READ') * 3 +
    getValue('SCORE_WHATSAPP_REPLY') * 1

  const getTemperature = (score: number) => {
    const hotThreshold = getValue('SCORE_HOT_THRESHOLD')
    const warmThreshold = getValue('SCORE_WARM_THRESHOLD')
    
    if (score >= hotThreshold) return { label: 'Quente', color: 'bg-red-500' }
    if (score >= warmThreshold) return { label: 'Morno', color: 'bg-yellow-500' }
    return { label: 'Frio', color: 'bg-blue-500' }
  }

  const temperature = getTemperature(exampleScore)

  return (
    <div className="space-y-6">
      {/* Link para regras avançadas */}
      <Alert>
        <AlertDescription className="flex items-center justify-between">
          <span>
            Configure aqui os valores base de pontuação. Para regras avançadas e automações, acesse a seção de Campanhas.
          </span>
          <Link href="/campaigns?tab=scoring">
            <Button size="sm" variant="outline">
              <ExternalLink className="mr-2 h-3 w-3" />
              Regras Avançadas
            </Button>
          </Link>
        </AlertDescription>
      </Alert>

      {/* Alert for recalculation needed */}
      {(needsRecalc || showRecalcWarning) && (
        <Alert className="border-yellow-500 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800">
              {needsRecalc 
                ? 'As configurações de scoring foram alteradas. Os scores dos leads precisam ser recalculados.'
                : 'Você tem alterações não salvas. Salve antes de recalcular os scores.'}
            </span>
            {needsRecalc && !showRecalcWarning && (
              <Button
                size="sm"
                onClick={() => recalculateScores.mutate(undefined)}
                disabled={recalculateScores.isPending}
              >
                {recalculateScores.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-3 w-3 animate-spin" />
                    Recalculando...
                  </>
                ) : (
                  <>
                    <Calculator className="mr-2 h-3 w-3" />
                    Recalcular Agora
                  </>
                )}
              </Button>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Pontuação por Ação */}
      <Card>
        <CardHeader>
          <CardTitle>Pontuação por Ação</CardTitle>
          <CardDescription>
            Configure quantos pontos cada ação do lead vale
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Email Open */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Abertura de E-mail
              </Label>
              <span className="text-sm font-medium">{getValue('SCORE_EMAIL_OPEN')} pontos</span>
            </div>
            <Slider
              value={[getValue('SCORE_EMAIL_OPEN')]}
              onValueChange={([value]) => handleChange('SCORE_EMAIL_OPEN', value)}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          {/* Email Click */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Clique em Link (E-mail)
              </Label>
              <span className="text-sm font-medium">{getValue('SCORE_EMAIL_CLICK')} pontos</span>
            </div>
            <Slider
              value={[getValue('SCORE_EMAIL_CLICK')]}
              onValueChange={([value]) => handleChange('SCORE_EMAIL_CLICK', value)}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          {/* Group Join */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Entrar no Grupo de Lançamento
              </Label>
              <span className="text-sm font-medium">{getValue('SCORE_GROUP_JOIN')} pontos</span>
            </div>
            <Slider
              value={[getValue('SCORE_GROUP_JOIN')]}
              onValueChange={([value]) => handleChange('SCORE_GROUP_JOIN', value)}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          {/* WhatsApp Read */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Visualizar Mensagem (WhatsApp)
              </Label>
              <span className="text-sm font-medium">{getValue('SCORE_WHATSAPP_READ')} pontos</span>
            </div>
            <Slider
              value={[getValue('SCORE_WHATSAPP_READ')]}
              onValueChange={([value]) => handleChange('SCORE_WHATSAPP_READ', value)}
              max={50}
              step={5}
              className="w-full"
            />
          </div>

          {/* WhatsApp Reply */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Responder Mensagem (WhatsApp)
              </Label>
              <span className="text-sm font-medium">{getValue('SCORE_WHATSAPP_REPLY')} pontos</span>
            </div>
            <Slider
              value={[getValue('SCORE_WHATSAPP_REPLY')]}
              onValueChange={([value]) => handleChange('SCORE_WHATSAPP_REPLY', value)}
              max={50}
              step={5}
              className="w-full"
            />
          </div>
        </CardContent>
      </Card>

      {/* Limites de Temperatura */}
      <Card>
        <CardHeader>
          <CardTitle>Classificação de Temperatura</CardTitle>
          <CardDescription>
            Configure os limites de pontuação para cada temperatura
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="hot-threshold">Limite para Lead Quente</Label>
            <Input
              id="hot-threshold"
              type="number"
              value={getValue('SCORE_HOT_THRESHOLD')}
              onChange={(e) => handleChange('SCORE_HOT_THRESHOLD', Number(e.target.value))}
              min={0}
              max={200}
            />
            <p className="text-xs text-muted-foreground">
              Leads com pontuação acima deste valor são considerados "Quentes"
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="warm-threshold">Limite para Lead Morno</Label>
            <Input
              id="warm-threshold"
              type="number"
              value={getValue('SCORE_WARM_THRESHOLD')}
              onChange={(e) => handleChange('SCORE_WARM_THRESHOLD', Number(e.target.value))}
              min={0}
              max={200}
            />
            <p className="text-xs text-muted-foreground">
              Leads com pontuação acima deste valor são considerados "Mornos"
            </p>
          </div>

          {/* Preview */}
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <p className="text-sm font-medium mb-3">Exemplo de Cálculo:</p>
            <div className="space-y-1 text-sm">
              <div>• 2 e-mails abertos: {getValue('SCORE_EMAIL_OPEN') * 2} pts</div>
              <div>• 1 clique em link: {getValue('SCORE_EMAIL_CLICK')} pts</div>
              <div>• Entrou no grupo: {getValue('SCORE_GROUP_JOIN')} pts</div>
              <div>• 3 mensagens visualizadas: {getValue('SCORE_WHATSAPP_READ') * 3} pts</div>
              <div>• 1 mensagem respondida: {getValue('SCORE_WHATSAPP_REPLY')} pts</div>
              <div className="pt-2 border-t mt-2 font-semibold flex items-center justify-between">
                <span>Total: {exampleScore} pontos</span>
                <Badge className={`${temperature.color} text-white`}>
                  {temperature.label}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2 flex-wrap">
        <Button
          onClick={handleSave}
          disabled={updateSetting.isPending || !hasChanges}
        >
          {updateSetting.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            'Salvar Alterações'
          )}
        </Button>
        <Button
          variant="outline"
          onClick={handleReset}
          disabled={resetToDefaults.isPending}
        >
          {resetToDefaults.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Restaurando...
            </>
          ) : (
            <>
              <RotateCcw className="mr-2 h-4 w-4" />
              Restaurar Padrões
            </>
          )}
        </Button>
        <Button
          variant="secondary"
          onClick={() => recalculateScores.mutate(undefined)}
          disabled={recalculateScores.isPending || hasChanges}
          title={hasChanges ? 'Salve as alterações antes de recalcular' : 'Recalcular scores de todos os leads'}
        >
          {recalculateScores.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Recalculando Scores...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Recalcular Todos os Scores
            </>
          )}
        </Button>
      </div>
    </div>
  )
}