'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { 
  Search, 
  Users, 
  RefreshCw,
  CheckCircle2,
  Circle,
  Loader2
} from 'lucide-react'

interface Group {
  id: string
  group_jid: string
  group_name: string
  group_description?: string | null
  participant_count: number
  is_launch_group: boolean
}

interface GroupsSelectorProps {
  groups: Group[]
  isLoading?: boolean
  onToggleLaunchGroup: (groupId: string, isLaunchGroup: boolean) => void
  onSync: () => void
  isSyncing?: boolean
}

export function GroupsSelector({
  groups,
  isLoading = false,
  onToggleLaunchGroup,
  onSync,
  isSyncing = false
}: GroupsSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [showOnlyLaunch, setShowOnlyLaunch] = useState(false)

  const filteredGroups = groups?.filter(group => {
    const matchesSearch = group.group_name.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesFilter = !showOnlyLaunch || group.is_launch_group
    return matchesSearch && matchesFilter
  }) || []

  const launchGroupsCount = groups?.filter(g => g.is_launch_group).length || 0
  const totalParticipants = groups
    ?.filter(g => g.is_launch_group)
    .reduce((sum, g) => sum + g.participant_count, 0) || 0

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Grupos do WhatsApp</h3>
            <p className="text-sm text-zinc-500">
              Selecione os grupos que serão usados no lançamento
            </p>
          </div>
          <Button
            variant="outline"
            onClick={onSync}
            disabled={isSyncing}
          >
            {isSyncing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Sincronizando...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Sincronizar
              </>
            )}
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="p-3 bg-zinc-50 rounded-lg">
            <p className="text-sm text-zinc-500">Total de Grupos</p>
            <p className="text-2xl font-bold">{groups?.length || 0}</p>
          </div>
          <div className="p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-600">Grupos de Lançamento</p>
            <p className="text-2xl font-bold text-green-600">{launchGroupsCount}</p>
          </div>
          <div className="p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-600">Total de Participantes</p>
            <p className="text-2xl font-bold text-blue-600">{totalParticipants}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
            <Input
              placeholder="Buscar grupos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button
            variant={showOnlyLaunch ? "default" : "outline"}
            onClick={() => setShowOnlyLaunch(!showOnlyLaunch)}
          >
            {showOnlyLaunch ? (
              <>
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Grupos de Lançamento
              </>
            ) : (
              <>
                <Circle className="h-4 w-4 mr-2" />
                Todos os Grupos
              </>
            )}
          </Button>
        </div>

        {/* Groups List */}
        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-zinc-500">
              {searchTerm || showOnlyLaunch 
                ? 'Nenhum grupo encontrado com os filtros aplicados'
                : 'Nenhum grupo disponível. Clique em "Sincronizar" para buscar grupos.'}
            </div>
          ) : (
            filteredGroups.map((group) => (
              <div
                key={group.id}
                className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${
                  group.is_launch_group 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-white border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <Checkbox
                  checked={group.is_launch_group}
                  onCheckedChange={(checked) => 
                    onToggleLaunchGroup(group.id, checked as boolean)
                  }
                />
                
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium">{group.group_name}</h4>
                    {group.is_launch_group && (
                      <Badge className="bg-green-500">Lançamento</Badge>
                    )}
                  </div>
                  {group.group_description && (
                    <p className="text-sm text-zinc-500 line-clamp-1">
                      {group.group_description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 text-sm text-zinc-500">
                  <Users className="h-4 w-4" />
                  <span>{group.participant_count} participantes</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Card>
  )
}