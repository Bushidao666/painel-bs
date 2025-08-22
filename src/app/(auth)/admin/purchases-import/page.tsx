'use client'

import { useState } from 'react'
import { AdminGuard } from '@/components/auth/admin-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Upload } from 'lucide-react'

export default function PurchasesImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [source, setSource] = useState<string>('master')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setResult(null)
    if (!file) return
    try {
      setIsSubmitting(true)
      const form = new FormData()
      form.append('file', file)
      form.append('source', source)
      const res = await fetch('/api/admin/purchases/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao importar')
      setResult(`Importadas ${json.imported} compras (${source}).`)
    } catch (err: any) {
      setResult(err.message || 'Erro desconhecido')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <AdminGuard>
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Importar Compras (CSV)</CardTitle>
            <CardDescription>Envie as planilhas Master/Plus e integre como compras gerais.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Fonte</Label>
                  <Select value={source} onValueChange={setSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="master">Master</SelectItem>
                      <SelectItem value="plus">Plus</SelectItem>
                      <SelectItem value="csv">CSV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
                  <Label>Arquivo CSV</Label>
                  <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!file || isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Importar
                </Button>
                {result && <span className="text-sm text-zinc-400">{result}</span>}
              </div>

              <div className="text-xs text-zinc-500">
                O CSV deve ter o header: "code,offer,created_at,paid_at,payment_method,product,commission,total_value,status,subscription_cycle,customer_name,customer_document,customer_document_type,customer_phone_number,customer_email_address,customer_streetname,customer_number,customer_complement,customer_neighborhood,customer_city,customer_state,customer_zipcode,affiliate_name,affiliate_company,affiliate_code,src,utm_site,utm_campaign,utm_content,utm_source,utm_term,utm_medium,utm_brand,sck,notafiscal,tracking"
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  )
}
