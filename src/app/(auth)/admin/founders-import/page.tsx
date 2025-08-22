'use client'

import { useState } from 'react'
import { AdminGuard } from '@/components/auth/admin-guard'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Loader2, Upload } from 'lucide-react'

export default function FoundersImportPage() {
  const [file, setFile] = useState<File | null>(null)
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
      const res = await fetch('/api/admin/founders/import', { method: 'POST', body: form })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Falha ao importar')
      const summary = json ? `Total: ${json.total ?? 0}, Inseridos: ${json.inserted ?? 0}, Atualizados: ${json.updated ?? 0}, Vinculados: ${json.linked ?? 0}, Criados: ${json.created ?? 0}` : 'Importação concluída'
      setResult(summary)
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
            <CardTitle>Importar Founder Members</CardTitle>
            <CardDescription>Envie o CSV da CNPay com colunas: Identificador, Nome, Email, Telefone, CPF, CNPJ.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Arquivo CSV</Label>
                <Input type="file" accept=".csv,text/csv" onChange={(e) => setFile(e.target.files?.[0] || null)} />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={!file || isSubmitting}>
                  {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                  Importar Founders
                </Button>
                {result && <span className="text-sm text-zinc-400">{result}</span>}
              </div>

              <div className="text-xs text-zinc-500">
                Header esperado: Identificador,Nome,Email,Telefone,CPF,CNPJ
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AdminGuard>
  )
}


