'use client'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { MoreHorizontal, Mail, Phone, TrendingUp } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { Lead } from '@/lib/types/database'

interface LeadsTableProps {
  leads: Array<Lead & { campaigns?: { nome: string } | null }>
  onEdit?: (lead: Lead) => void
  onDelete?: (id: string) => void
}

export function LeadsTable({ leads, onEdit, onDelete }: LeadsTableProps) {
  const getTemperatureBadge = (temperatura: string | null) => {
    switch (temperatura) {
      case 'hot':
        return <Badge variant="destructive">Quente</Badge>
      case 'warm':
        return <Badge className="bg-yellow-500">Morno</Badge>
      case 'cold':
        return <Badge variant="secondary">Frio</Badge>
      default:
        return <Badge variant="outline">Não definido</Badge>
    }
  }

  const getScoreBadge = (score: number | null) => {
    if (!score) return null
    
    let variant: "default" | "secondary" | "destructive" = "secondary"
    if (score >= 70) variant = "destructive"
    else if (score >= 40) variant = "default"
    
    return (
      <Badge variant={variant} className="gap-1">
        <TrendingUp className="h-3 w-3" />
        {score}
      </Badge>
    )
  }

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Contato</TableHead>
            <TableHead>Temperatura</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Campanha</TableHead>
            <TableHead>Origem</TableHead>
            <TableHead>Cadastro</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leads.map((lead) => (
            <TableRow key={lead.id}>
              <TableCell className="font-medium">{lead.nome}</TableCell>
              <TableCell>
                <div className="space-y-1">
                  <div className="flex items-center gap-1 text-sm">
                    <Mail className="h-3 w-3 text-zinc-400" />
                    {lead.email}
                  </div>
                  <div className="flex items-center gap-1 text-sm">
                    <Phone className="h-3 w-3 text-zinc-400" />
                    {lead.telefone}
                  </div>
                </div>
              </TableCell>
              <TableCell>{getTemperatureBadge(lead.temperatura)}</TableCell>
              <TableCell>{getScoreBadge(lead.score)}</TableCell>
              <TableCell>{lead.campaigns?.nome || '-'}</TableCell>
              <TableCell>{lead.origem || '-'}</TableCell>
              <TableCell className="text-sm text-zinc-500">
                {formatDistanceToNow(new Date(lead.created_at), {
                  addSuffix: true,
                  locale: ptBR
                })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(lead)}>
                      Editar
                    </DropdownMenuItem>
                    <DropdownMenuItem>Ver detalhes</DropdownMenuItem>
                    <DropdownMenuItem>Adicionar evento</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600"
                      onClick={() => onDelete?.(lead.id)}
                    >
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}