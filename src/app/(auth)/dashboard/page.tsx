'use client'

import { Users, TrendingUp, DollarSign, Target } from 'lucide-react'
import { KPICard } from '@/components/dashboard/kpi-card'
import { LaunchCountdown } from '@/components/countdown/launch-countdown'
import { LeadTemperatureChart } from '@/components/dashboard/lead-temperature-chart'
import { ActivityFeed } from '@/components/dashboard/activity-feed'
import { ConversionFunnel } from '@/components/dashboard/conversion-funnel'
import { SyncStatus } from '@/components/dashboard/sync-status'
import { useDashboardStats, useLeadsByTemperature } from '@/hooks/use-dashboard-stats'
import { useActiveCampaign } from '@/hooks/use-campaigns'
import { useRealtimeLeads, useRealtimeConversions } from '@/hooks/use-realtime'

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, refetch: refetchStats } = useDashboardStats()
  const { data: temperatureData } = useLeadsByTemperature()
  const { data: activeCampaign } = useActiveCampaign()
  
  // Ativar real-time
  useRealtimeLeads()
  useRealtimeConversions()

  if (statsLoading) {
    return <div>Carregando...</div>
  }

  const funnelData = [
    { stage: 'Visitantes', count: 10000, percentage: 100 },
    { stage: 'Leads Captados', count: stats?.totalLeads || 0, percentage: ((stats?.totalLeads || 0) / 100) },
    { stage: 'Leads Quentes', count: stats?.hotLeads || 0, percentage: ((stats?.hotLeads || 0) / (stats?.totalLeads || 1)) * 100 },
    { stage: 'Conversões', count: Math.floor((stats?.conversionRate || 0) * (stats?.totalLeads || 0) / 100), percentage: stats?.conversionRate || 0 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-zinc-500">Acompanhe as métricas do seu lançamento em tempo real</p>
        </div>
        <SyncStatus onSync={() => refetchStats?.()} />
      </div>

      {activeCampaign && (
        <LaunchCountdown 
          targetDate={activeCampaign.data_lancamento}
          campaignName={activeCampaign.nome}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          title="Total de Leads"
          value={stats?.totalLeads || 0}
          description="Leads captados até agora"
          icon={Users}
          trend={{ value: 12.5, isPositive: true }}
        />
        <KPICard
          title="Leads Quentes"
          value={stats?.hotLeads || 0}
          description="Prontos para conversão"
          icon={Target}
          trend={{ value: 8.2, isPositive: true }}
        />
        <KPICard
          title="Taxa de Conversão"
          value={`${stats?.conversionRate.toFixed(1)}%`}
          description="Leads convertidos"
          icon={TrendingUp}
          trend={{ value: 3.1, isPositive: true }}
        />
        <KPICard
          title="Receita Total"
          value={`R$ ${stats?.totalRevenue.toLocaleString('pt-BR')}`}
          description="Faturamento do lançamento"
          icon={DollarSign}
          trend={{ value: 15.8, isPositive: true }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {temperatureData && <LeadTemperatureChart data={temperatureData} />}
          <ConversionFunnel data={funnelData} />
        </div>
        <div>
          <ActivityFeed leads={stats?.recentLeads || []} />
        </div>
      </div>
    </div>
  )
}