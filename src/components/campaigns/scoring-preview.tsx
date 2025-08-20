'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { TrendingUp, Flame, Snowflake, FlameKindling } from 'lucide-react'
import { useScoringSettings } from '@/hooks/use-settings'
import { ScoringRule } from '@/hooks/use-scoring-rules'

interface ScoringPreviewProps {
  rules: ScoringRule[]
  className?: string
}

export function ScoringPreview({ rules, className }: ScoringPreviewProps) {
  const { scoringValues } = useScoringSettings()

  // Simular eventos para exemplo
  const exampleEvents = [
    { type: 'email_open', count: 2, label: 'Emails Abertos' },
    { type: 'email_click', count: 1, label: 'Cliques em Links' },
    { type: 'whatsapp_read', count: 3, label: 'Mensagens Lidas' },
    { type: 'whatsapp_reply', count: 1, label: 'Mensagens Respondidas' },
    { type: 'group_join', count: 1, label: 'Entrou no Grupo' },
  ]

  // Calcular score baseado nas regras ativas
  const calculateScore = () => {
    let total = 10 // Score base
    const breakdown: { label: string; points: number }[] = [
      { label: 'Score Base', points: 10 }
    ]

    exampleEvents.forEach(event => {
      const rule = rules.find(r => 
        r.ativo && r.condicao.event_type === event.type
      )
      
      if (rule && event.count > 0) {
        const points = rule.pontos * event.count
        total += points
        breakdown.push({
          label: `${event.label} (${event.count}x)`,
          points
        })
      }
    })

    // Bonus por engajamento recente (últimas 24h)
    const recentBonus = 10
    total += recentBonus
    breakdown.push({ label: 'Engajamento Recente', points: recentBonus })

    return { total: Math.min(total, 100), breakdown }
  }

  const { total, breakdown } = calculateScore()
  
  const hotThreshold = scoringValues?.SCORE_HOT_THRESHOLD || 70
  const warmThreshold = scoringValues?.SCORE_WARM_THRESHOLD || 40

  const getTemperature = (score: number) => {
    if (score >= hotThreshold) {
      return { 
        label: 'Quente', 
        color: 'bg-red-500 text-white', 
        icon: FlameKindling,
        description: 'Lead altamente engajado e pronto para conversão'
      }
    }
    if (score >= warmThreshold) {
      return { 
        label: 'Morno', 
        color: 'bg-yellow-500 text-white', 
        icon: Flame,
        description: 'Lead demonstrando interesse, necessita nutrição'
      }
    }
    return { 
      label: 'Frio', 
      color: 'bg-blue-500 text-white', 
      icon: Snowflake,
      description: 'Lead em fase inicial, requer aquecimento'
    }
  }

  const temperature = getTemperature(total)
  const TemperatureIcon = temperature.icon

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Preview do Cálculo de Score
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Score Total */}
        <div className="text-center space-y-2">
          <div className="text-4xl font-bold">{total}</div>
          <Progress value={total} className="h-3" />
          <div className="flex items-center justify-center gap-2">
            <Badge className={temperature.color}>
              <TemperatureIcon className="h-4 w-4 mr-1" />
              {temperature.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {temperature.description}
          </p>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium">Detalhamento da Pontuação:</h4>
          <div className="space-y-1">
            {breakdown.map((item, index) => (
              <div 
                key={index}
                className="flex justify-between items-center text-sm py-1 px-2 rounded hover:bg-muted/50"
              >
                <span className="text-muted-foreground">{item.label}</span>
                <span className="font-medium">+{item.points} pts</span>
              </div>
            ))}
          </div>
        </div>

        {/* Limites */}
        <div className="pt-3 border-t space-y-2">
          <h4 className="text-sm font-medium">Classificação por Score:</h4>
          <div className="space-y-1 text-sm">
            <div className="flex items-center gap-2">
              <Badge className="bg-blue-500 text-white">
                <Snowflake className="h-3 w-3 mr-1" />
                Frio
              </Badge>
              <span className="text-muted-foreground">0 - {warmThreshold - 1} pontos</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-yellow-500 text-white">
                <Flame className="h-3 w-3 mr-1" />
                Morno
              </Badge>
              <span className="text-muted-foreground">{warmThreshold} - {hotThreshold - 1} pontos</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-red-500 text-white">
                <FlameKindling className="h-3 w-3 mr-1" />
                Quente
              </Badge>
              <span className="text-muted-foreground">{hotThreshold} - 100 pontos</span>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="p-3 bg-muted/50 rounded-lg">
          <p className="text-xs text-muted-foreground">
            Este é um exemplo de cálculo baseado nas regras ativas. 
            O score real de cada lead é calculado automaticamente com base em suas interações.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}