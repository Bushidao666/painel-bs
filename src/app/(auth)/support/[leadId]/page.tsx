'use client'

import { useParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AdminGuard } from '@/components/auth/admin-guard'
import { useSupportLeadDetails } from '@/hooks/use-support'

export default function SupportLeadDetailsPage() {
  const params = useParams<{ leadId: string }>()
  const leadId = params?.leadId
  const { data, isLoading } = useSupportLeadDetails(leadId)

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Detalhes do Cliente</h1>
          <p className="text-zinc-500">Informações de perfil, eventos e compras</p>
        </div>

        {isLoading && <div>Carregando...</div>}
        {data && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="p-4 lg:col-span-1">
              <div className="font-semibold mb-2">Perfil</div>
              <div className="space-y-1 text-sm">
                <div><span className="text-zinc-500">Nome:</span> {data.lead?.nome}</div>
                <div><span className="text-zinc-500">Email:</span> {data.lead?.email}</div>
                <div><span className="text-zinc-500">Telefone:</span> {data.lead?.telefone}</div>
                <div><span className="text-zinc-500">Temperatura:</span> {data.lead?.temperatura}</div>
                <div><span className="text-zinc-500">Score:</span> {data.lead?.score}</div>
                <div><span className="text-zinc-500">Origem:</span> {data.lead?.origem || '-'}</div>
                <div><span className="text-zinc-500">Tags:</span> {(data.lead?.tags || []).join(', ')}</div>
                {data.founder && (
                  <>
                    <div className="mt-3 font-semibold">Dados de Compra</div>
                    <div><span className="text-zinc-500">Compra:</span> {data.founder.compra || '-'}</div>
                    <div><span className="text-zinc-500">Valor:</span> {data.founder.valor_compra != null ? `R$ ${Number(data.founder.valor_compra).toLocaleString('pt-BR')}` : '-'}</div>
                    <div><span className="text-zinc-500">Data:</span> {data.founder.purchased_at ? new Date(data.founder.purchased_at).toLocaleString('pt-BR') : '-'}</div>
                  </>
                )}
              </div>
            </Card>

            <Card className="p-4 lg:col-span-2">
              <div className="font-semibold mb-2">Eventos Recentes</div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Data</TableHead>
                      <TableHead>Metadata</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.events.map((ev: any) => (
                      <TableRow key={ev.id}>
                        <TableCell>{ev.event_type}</TableCell>
                        <TableCell>{ev.created_at ? new Date(ev.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                        <TableCell>
                          <pre className="whitespace-pre-wrap text-xs text-zinc-600">{JSON.stringify(ev.metadata || {}, null, 2)}</pre>
                        </TableCell>
                      </TableRow>
                    ))}
                    {data.events.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center text-sm text-zinc-500">Nenhum evento</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            <Card className="p-4 lg:col-span-3">
              <div className="font-semibold mb-2">Transações</div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Valor</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.conversions.map((cv: any) => (
                      <TableRow key={cv.id}>
                        <TableCell>{cv.tipo_conversao || 'compra'}</TableCell>
                        <TableCell>{cv.produto || '-'}</TableCell>
                        <TableCell>{cv.valor != null ? `R$ ${Number(cv.valor).toLocaleString('pt-BR')}` : '-'}</TableCell>
                        <TableCell>{cv.created_at ? new Date(cv.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                      </TableRow>
                    ))}
                    {data.conversions.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-sm text-zinc-500">Nenhuma transação</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </div>
        )}
      </div>
    </AdminGuard>
  )
}


