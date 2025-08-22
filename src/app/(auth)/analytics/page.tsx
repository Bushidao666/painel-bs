'use client'

import { useEffect, useState } from 'react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from 'recharts'

export default function AnalyticsPage() {
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any | null>(null)
  const [series, setSeries] = useState<any | null>(null)
  const [tops, setTops] = useState<any | null>(null)
  const [periodDays, setPeriodDays] = useState(30)
  const [revenue, setRevenue] = useState<any[] | null>(null)
  const [funnel, setFunnel] = useState<any[] | null>(null)

  const fetchData = async () => {
    setLoading(true)
    try {
      const resp = await fetch('/api/analytics/summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      const json = await resp.json()
      setData(json)
      const tsResp = await fetch('/api/analytics/timeseries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: periodDays }) })
      const ts = await tsResp.json()
      setSeries(ts)
      const topResp = await fetch('/api/analytics/top', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ limit: 10 }) })
      const top = await topResp.json()
      setTops(top)
      const revResp = await fetch('/api/analytics/revenue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: periodDays }) })
      const rev = await revResp.json()
      setRevenue(rev)
      const funnelResp = await fetch('/api/analytics/funnel', { method: 'POST' })
      const fun = await funnelResp.json()
      setFunnel(fun)
    } catch (e) {
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [periodDays])

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-zinc-500">Indicadores chave dos seus leads e grupos</p>
        </div>
        <div className="flex gap-2">
          <div className="flex items-center gap-2">
            <Button variant={periodDays===7? 'default':'outline'} onClick={() => setPeriodDays(7)}>7d</Button>
            <Button variant={periodDays===30? 'default':'outline'} onClick={() => setPeriodDays(30)}>30d</Button>
            <Button variant={periodDays===90? 'default':'outline'} onClick={() => setPeriodDays(90)}>90d</Button>
          </div>
          <Button variant="outline" onClick={fetchData} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}<span className="ml-2">Atualizar</span>
          </Button>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center h-32">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      )}

      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Card className="p-4">
            <p className="text-sm text-zinc-500">Total de Leads</p>
            <p className="text-2xl font-bold">{data.totalLeads}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-zinc-500">Em Grupos de Lançamento</p>
            <p className="text-2xl font-bold">{data.leadsInGroups}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-zinc-500">No Fórum</p>
            <p className="text-2xl font-bold">{data.leadsInForum}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-zinc-500">Leads com Compras</p>
            <p className="text-2xl font-bold">{data.leadsWithPurchases}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-zinc-500">Ticket Médio por Lead</p>
            <p className="text-2xl font-bold">R$ {Number(data.avgTicketPerLead || 0).toFixed(2)}</p>
          </Card>
          <Card className="p-4">
            <p className="text-sm text-zinc-500">Grupos de Lançamento</p>
            <p className="text-2xl font-bold">{data.launchGroups}</p>
          </Card>
        </div>
      )}

      {series && (
        <Card className="p-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold">Séries (últimos 30 dias)</h2>
            <p className="text-sm text-zinc-500">Leads criados, entradas em grupos e compras</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={(series.leads || []).map((d: any, i: number) => ({ day: d.day, leads: d.count, joins: (series.joins?.[i]?.count)||0, purchases: (series.purchases?.[i]?.count)||0 }))}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Area type="monotone" dataKey="leads" stroke="#3b82f6" fill="#93c5fd" name="Leads" />
                <Area type="monotone" dataKey="joins" stroke="#10b981" fill="#86efac" name="Entradas em grupos" />
                <Area type="monotone" dataKey="purchases" stroke="#f59e0b" fill="#fde68a" name="Compras" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {revenue && (
        <Card className="p-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold">Receita diária</h2>
            <p className="text-sm text-zinc-500">Soma de compras por dia</p>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenue}>
                <XAxis dataKey="day" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v:any) => [`R$ ${Number(v).toFixed(2)}`, 'Receita']} />
                <Legend />
                <Area type="monotone" dataKey="revenue" stroke="#8b5cf6" fill="#c4b5fd" name="Receita" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {funnel && (
        <Card className="p-4">
          <div className="mb-2">
            <h2 className="text-lg font-semibold">Funil</h2>
            <p className="text-sm text-zinc-500">Leads → Grupos → Fórum → Compras</p>
          </div>
          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={funnel} layout="vertical" margin={{ left: 40 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis dataKey="stage" type="category" tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                <Bar dataKey="value" fill="#60a5fa" name="Quantidade" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      {tops && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Top grupos por participantes</h3>
            <div className="space-y-2">
              {(tops.groups || []).map((g: any, i: number) => (
                <button
                  key={i}
                  className="w-full flex items-center justify-between text-sm hover:bg-zinc-50 rounded px-2 py-1 text-left"
                  onClick={async () => {
                    const resp = await fetch('/api/analytics/groups/members', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ group_jid: g.group_jid, limit: 50, page: 1 }) })
                    const json = await resp.json()
                    alert(`${g.group_name || g.group_jid}: ${json.count} membros\nExibindo até 50.`)
                  }}
                >
                  <span className="truncate">{g.group_name || g.group_jid}</span>
                  <span className="font-medium">{g.participants}</span>
                </button>
              ))}
            </div>
          </Card>
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-2">Top produtos por receita</h3>
            <div className="space-y-2">
              {(tops.products || []).map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="truncate">{p.product}</span>
                  <span className="font-medium">R$ {Number(p.revenue||0).toFixed(2)}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}


