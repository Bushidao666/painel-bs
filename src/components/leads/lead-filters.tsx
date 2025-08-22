'use client'

import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Filter, Download, Plus } from 'lucide-react'

interface LeadFiltersProps {
  onSearch?: (value: string) => void
  onTemperatureFilter?: (value: string) => void
  onOriginFilter?: (value: string) => void
  onInGroupsFilter?: (value: 'all'|'in'|'out') => void
  onAddLead?: () => void
  onExport?: () => void
}

export function LeadFilters({
  onSearch,
  onTemperatureFilter,
  onOriginFilter,
  onInGroupsFilter,
  onAddLead,
  onExport
}: LeadFiltersProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
        <Input
          placeholder="Buscar por nome, email ou telefone..."
          className="pl-10"
          onChange={(e) => onSearch?.(e.target.value)}
        />
      </div>
      
      <div className="flex gap-2">
        <Select onValueChange={(v) => onInGroupsFilter?.(v as any)}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Grupos de lançamento" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="in">Em grupos</SelectItem>
            <SelectItem value="out">Fora de grupos</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onTemperatureFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Temperatura" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="hot">Quentes</SelectItem>
            <SelectItem value="warm">Mornos</SelectItem>
            <SelectItem value="cold">Frios</SelectItem>
          </SelectContent>
        </Select>

        <Select onValueChange={onOriginFilter}>
          <SelectTrigger className="w-[150px]">
            <SelectValue placeholder="Origem" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="instagram">Instagram</SelectItem>
            <SelectItem value="facebook">Facebook</SelectItem>
            <SelectItem value="google">Google</SelectItem>
            <SelectItem value="organico">Orgânico</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="outline" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>

        <Button onClick={onAddLead}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Lead
        </Button>
      </div>
    </div>
  )
}