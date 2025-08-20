'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { User, TrendingUp, Mail, Phone } from 'lucide-react'
import type { Lead } from '@/lib/types/database'

interface ActivityFeedProps {
  leads: Lead[]
}

export function ActivityFeed({ leads }: ActivityFeedProps) {
  const getTemperatureBadge = (temperatura: string | null) => {
    switch (temperatura) {
      case 'hot':
        return <Badge variant="destructive">Quente</Badge>
      case 'warm':
        return <Badge variant="secondary">Morno</Badge>
      case 'cold':
        return <Badge variant="outline">Frio</Badge>
      default:
        return null
    }
  }

  return (
    <Card className="p-6">
      <h3 className="text-lg font-semibold mb-4">Atividade Recente</h3>
      <div className="space-y-4">
        {leads.map((lead) => (
          <div key={lead.id} className="flex items-start gap-3 pb-4 border-b last:border-0">
            <div className="rounded-full bg-zinc-100 p-2">
              <User className="h-4 w-4 text-zinc-600" />
            </div>
            <div className="flex-1 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">{lead.nome}</p>
                {getTemperatureBadge(lead.temperatura)}
              </div>
              <div className="flex items-center gap-4 text-xs text-zinc-500">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {lead.email}
                </span>
                <span className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  {lead.telefone}
                </span>
              </div>
              <p className="text-xs text-zinc-400">
                {formatDistanceToNow(new Date(lead.created_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </p>
            </div>
            {lead.score && (
              <div className="flex items-center gap-1">
                <TrendingUp className="h-4 w-4 text-green-500" />
                <span className="text-sm font-semibold">{lead.score}</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  )
}