'use client'

import { useState } from 'react'
import { Search, Shield } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import Link from 'next/link'
import { useSupportSearch, useSupportPurchaseLookup } from '@/hooks/use-support'
import { AdminGuard } from '@/components/auth/admin-guard'

export default function SupportPage() {
  const [query, setQuery] = useState('')
  const [purchaseQuery, setPurchaseQuery] = useState('')

  const search = useSupportSearch({ query })
  const purchase = useSupportPurchaseLookup({ purchaseIdOrEmail: purchaseQuery })

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Suporte</h1>
            <p className="text-zinc-500">Busque clientes por email/telefone e compras por ID</p>
          </div>
          <Shield className="h-6 w-6 text-purple-600" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="p-4">
            <div className="mb-3 font-medium">Buscar Cliente</div>
            <div className="flex gap-2 items-center">
              <Search className="h-4 w-4 text-zinc-500" />
              <Input
                placeholder="Nome, email ou telefone"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>

            <div className="mt-4">
              {search.isLoading && <div className="text-sm text-zinc-500">Carregando...</div>}
              {search.data && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold mb-2">Leads</div>
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
                          {search.data.leads.map((lead: any) => (
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
                          {search.data.leads.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Nenhum lead encontrado</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Membros Compradores</div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Telefone</TableHead>
                            <TableHead>Compra</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {search.data.founders.map((fm: any) => (
                            <TableRow key={fm.id}>
                              <TableCell className="font-medium">{fm.nome}</TableCell>
                              <TableCell>{fm.email}</TableCell>
                              <TableCell>{fm.telefone}</TableCell>
                              <TableCell>{fm.compra || '-'}</TableCell>
                            </TableRow>
                          ))}
                          {search.data.founders.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={4} className="text-center text-sm text-zinc-500">Nenhum comprador encontrado</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card className="p-4">
            <div className="mb-3 font-medium">Buscar por ID de Compra ou Email</div>
            <div className="flex gap-2 items-center">
              <Search className="h-4 w-4 text-zinc-500" />
              <Input
                placeholder="ID de compra (compra) ou email"
                value={purchaseQuery}
                onChange={(e) => setPurchaseQuery(e.target.value)}
              />
            </div>
            <div className="mt-4">
              {purchase.isLoading && <div className="text-sm text-zinc-500">Carregando...</div>}
              {purchase.data && (
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-semibold mb-2">Registros de Compra</div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Compra</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchase.data.founders.map((fm: any) => (
                            <TableRow key={fm.id}>
                              <TableCell className="font-medium">{fm.nome}</TableCell>
                              <TableCell>{fm.email}</TableCell>
                              <TableCell>{fm.compra || '-'}</TableCell>
                              <TableCell>{fm.valor_compra != null ? `R$ ${Number(fm.valor_compra).toLocaleString('pt-BR')}` : '-'}</TableCell>
                              <TableCell>{fm.purchased_at ? new Date(fm.purchased_at).toLocaleString('pt-BR') : '-'}</TableCell>
                            </TableRow>
                          ))}
                          {purchase.data.founders.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Nenhuma compra encontrada</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-semibold mb-2">Transações (conversions)</div>
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Lead</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Produto</TableHead>
                            <TableHead>Valor</TableHead>
                            <TableHead>Data</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {purchase.data.conversions.map((cv: any) => (
                            <TableRow key={cv.id}>
                              <TableCell>{cv.lead_id}</TableCell>
                              <TableCell>{cv.tipo_conversao || 'compra'}</TableCell>
                              <TableCell>{cv.produto || '-'}</TableCell>
                              <TableCell>{cv.valor != null ? `R$ ${Number(cv.valor).toLocaleString('pt-BR')}` : '-'}</TableCell>
                              <TableCell>{cv.created_at ? new Date(cv.created_at).toLocaleString('pt-BR') : '-'}</TableCell>
                            </TableRow>
                          ))}
                          {purchase.data.conversions.length === 0 && (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm text-zinc-500">Nenhuma transação encontrada</TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </AdminGuard>
  )
}

