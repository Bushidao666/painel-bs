'use client'

import { useState } from 'react'
import { Search, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { useSupportSearch, useSupportPurchasesPaginated } from '@/hooks/use-support'
import { PaginationControls } from '@/components/leads/pagination-controls'
import { AdminGuard } from '@/components/auth/admin-guard'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function SupportPage() {
  // Leads
  const [query, setQuery] = useState('')
  const search = useSupportSearch({ query })

  // Compras (paginação)
  const [pPage, setPPage] = useState(1)
  const [pPageSize, setPPageSize] = useState(25)
  const [pSearch, setPSearch] = useState('')
  const purchases = useSupportPurchasesPaginated({ page: pPage, pageSize: pPageSize, search: pSearch })

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Suporte</h1>
            <p className="text-zinc-500">Consulta rápida de Leads e Compras</p>
          </div>
          <Shield className="h-6 w-6 text-purple-600" />
        </div>

        <Tabs defaultValue="purchases" className="space-y-4">
          <TabsList>
            <TabsTrigger value="purchases">Compras</TabsTrigger>
            <TabsTrigger value="leads">Leads</TabsTrigger>
          </TabsList>

          {/* Tab Compras */}
          <TabsContent value="purchases">
            <Card className="p-4">
              <div className="flex gap-2 items-center mb-3">
                <Search className="h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Filtrar por código, produto, email ou telefone"
                  value={pSearch}
                  onChange={(e) => { setPPage(1); setPSearch(e.target.value) }}
                />
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Compra</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Lead</TableHead>
                      <TableHead>Pago em</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {purchases.isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Carregando...</TableCell>
                      </TableRow>
                    )}
                    {purchases.data?.items?.map((row: any) => (
                      <TableRow key={row.purchase_id} className="align-top">
                        {/* Compra */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-mono text-xs text-zinc-300">{row.code}</span>
                            <span className="text-xs text-zinc-500">ID</span>
                          </div>
                        </TableCell>
                        {/* Produto */}
                        <TableCell>
                          <div className="max-w-[280px] truncate" title={row.product || ''}>
                            {row.product || '-'}
                          </div>
                        </TableCell>
                        {/* Cliente */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{row.customer_email_address || '-'}</span>
                            <span className="text-xs text-zinc-500">{row.customer_phone_number || '-'}</span>
                          </div>
                        </TableCell>
                        {/* Lead */}
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-sm">{row.lead_email || '-'}</span>
                            <span className="text-xs text-zinc-500">{row.lead_telefone || '-'}</span>
                            {row.lead_id && (
                              <Link href={`/support/${row.lead_id}`} className="text-xs text-purple-500 hover:underline mt-1">ver lead</Link>
                            )}
                          </div>
                        </TableCell>
                        {/* Pago em */}
                        <TableCell className="whitespace-nowrap">
                          {row.paid_at ? new Date(row.paid_at).toLocaleString('pt-BR') : '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                    {purchases.data && purchases.data.items.length === 0 && !purchases.isLoading && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Nenhuma compra encontrada</TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>

              <PaginationControls
                currentPage={pPage}
                totalPages={Math.max(1, Math.ceil((purchases.data?.totalCount || 0) / pPageSize))}
                pageSize={pPageSize}
                totalCount={purchases.data?.totalCount || 0}
                from={(pPage - 1) * pPageSize + 1}
                to={Math.min(pPage * pPageSize, purchases.data?.totalCount || 0)}
                onPageChange={setPPage}
                onPageSizeChange={(size) => { setPPageSize(size); setPPage(1) }}
                isLoading={purchases.isLoading}
              />
            </Card>
          </TabsContent>

          {/* Tab Leads */}
          <TabsContent value="leads">
            <Card className="p-4">
              <div className="flex gap-2 items-center mb-3">
                <Search className="h-4 w-4 text-zinc-500" />
                <Input
                  placeholder="Nome, email ou telefone"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>

              <div className="space-y-6">
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nome</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Temperatura</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {search.isLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Carregando...</TableCell>
                        </TableRow>
                      )}
                      {search.data?.leads?.map((lead: any) => (
                        <TableRow key={lead.id}>
                          <TableCell className="font-medium">{lead.nome}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.telefone}</TableCell>
                          <TableCell>{lead.temperatura}</TableCell>
                          <TableCell className="text-right">
                            <Link className="text-purple-600 hover:underline" href={`/support/${lead.id}`}>Detalhes</Link>
                          </TableCell>
                        </TableRow>
                      ))}
                      {search.data && search.data.leads.length === 0 && !search.isLoading && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Nenhum lead encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Membros Compradores</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Telefone</TableHead>
                        <TableHead>Compra</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {search.data?.founders?.map((fm: any) => (
                        <TableRow key={fm.id}>
                          <TableCell className="font-medium">{fm.nome}</TableCell>
                          <TableCell>{fm.email}</TableCell>
                          <TableCell>{fm.telefone}</TableCell>
                          <TableCell>{fm.compra || '-'}</TableCell>
                        </TableRow>
                      ))}
                      {search.data && search.data.founders.length === 0 && !search.isLoading && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-sm text-zinc-500">Nenhum comprador encontrado</TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminGuard>
  )
}


