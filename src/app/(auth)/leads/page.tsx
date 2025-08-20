'use client'

import { useState, useEffect } from 'react'
import { LeadsTable } from '@/components/leads/leads-table'
import { LeadFilters } from '@/components/leads/lead-filters'
import { PaginationControls } from '@/components/leads/pagination-controls'
import { useLeadsPaginated } from '@/hooks/use-leads-paginated'
import { useRealtimeLeads } from '@/hooks/use-realtime'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, RefreshCw } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'

export default function LeadsPage() {
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const [searchTerm, setSearchTerm] = useState('')
  const [temperatureFilter, setTemperatureFilter] = useState('all')
  const [originFilter, setOriginFilter] = useState('all')

  const { 
    leads, 
    totalCount,
    totalPages,
    from,
    to,
    isLoading,
    isFetching,
    deleteLead 
  } = useLeadsPaginated({
    page: currentPage,
    pageSize,
    searchTerm,
    temperatureFilter,
    originFilter
  })

  // Ativar real-time
  useRealtimeLeads()

  // Mutation para sincronizar todos os leads
  const syncAllLeads = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/sync/all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Erro ao sincronizar')
      return response.json()
    },
    onSuccess: (data) => {
      toast.success(`Sincronização concluída! ${data.syncedSuccessfully} leads atualizados`)
    },
    onError: () => {
      toast.error('Erro ao sincronizar leads')
    }
  })

  // Reset para primeira página quando filtros mudam
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, temperatureFilter, originFilter, pageSize])

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir este lead?')) {
      try {
        await deleteLead.mutateAsync(id)
        toast.success('Lead excluído com sucesso')
      } catch (error) {
        toast.error('Erro ao excluir lead')
      }
    }
  }

  const handleExport = () => {
    toast.info('Funcionalidade de exportação em desenvolvimento')
  }

  const handleAddLead = () => {
    toast.info('Modal de adicionar lead em desenvolvimento')
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    // Scroll para o topo da tabela
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePageSizeChange = (size: number) => {
    setPageSize(size)
    setCurrentPage(1) // Voltar para primeira página ao mudar tamanho
  }

  // Calcular estatísticas dos leads filtrados
  const getStats = () => {
    if (!leads) return { hot: 0, warm: 0, cold: 0 }
    
    return {
      hot: leads.filter(l => l.temperatura === 'hot').length,
      warm: leads.filter(l => l.temperatura === 'warm').length,
      cold: leads.filter(l => l.temperatura === 'cold').length
    }
  }

  const stats = getStats()

  if (isLoading && !leads) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold">Gestão de Leads</h1>
          <p className="text-zinc-500">Gerencie e acompanhe todos os seus leads</p>
        </div>
        <Button
          onClick={() => syncAllLeads.mutate()}
          disabled={syncAllLeads.isPending}
          variant="outline"
        >
          {syncAllLeads.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Sincronizando...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sincronizar Todos
            </>
          )}
        </Button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-sm text-zinc-500">Total de Leads</p>
          <p className="text-2xl font-bold">{totalCount}</p>
        </Card>
        <Card className="p-4 bg-red-50 border-red-200">
          <p className="text-sm text-red-600">Leads Quentes</p>
          <p className="text-2xl font-bold text-red-600">{stats.hot}</p>
        </Card>
        <Card className="p-4 bg-yellow-50 border-yellow-200">
          <p className="text-sm text-yellow-600">Leads Mornos</p>
          <p className="text-2xl font-bold text-yellow-600">{stats.warm}</p>
        </Card>
        <Card className="p-4 bg-blue-50 border-blue-200">
          <p className="text-sm text-blue-600">Leads Frios</p>
          <p className="text-2xl font-bold text-blue-600">{stats.cold}</p>
        </Card>
      </div>

      {/* Filtros */}
      <LeadFilters
        onSearch={setSearchTerm}
        onTemperatureFilter={setTemperatureFilter}
        onOriginFilter={setOriginFilter}
        onExport={handleExport}
        onAddLead={handleAddLead}
      />

      {/* Tabela de leads */}
      <div className="relative">
        {isFetching && (
          <div className="absolute inset-0 bg-white/50 flex items-center justify-center z-10">
            <Loader2 className="h-6 w-6 animate-spin text-zinc-400" />
          </div>
        )}
        
        {leads && leads.length > 0 ? (
          <>
            <LeadsTable 
              leads={leads} 
              onDelete={handleDelete}
            />
            
            {/* Controles de paginação */}
            <PaginationControls
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalCount={totalCount}
              from={from}
              to={to}
              onPageChange={handlePageChange}
              onPageSizeChange={handlePageSizeChange}
              isLoading={isFetching}
            />
          </>
        ) : (
          <Card className="p-8 text-center">
            <p className="text-zinc-500">
              {searchTerm || temperatureFilter !== 'all' || originFilter !== 'all' 
                ? 'Nenhum lead encontrado com os filtros aplicados' 
                : 'Nenhum lead cadastrado ainda'}
            </p>
          </Card>
        )}
      </div>
    </div>
  )
}