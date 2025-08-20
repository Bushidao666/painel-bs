'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2, Save, Upload, Download } from 'lucide-react'
import { useSettings } from '@/hooks/use-settings'
import { toast } from 'sonner'

export function GeneralSettings() {
  const { settings, updateSetting, isLoading } = useSettings('general')
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  // Pegar valores locais ou do banco
  const getValue = (key: string) => {
    return localValues[key] ?? settings?.find(s => s.key === key)?.value ?? ''
  }

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    const updates = Object.entries(localValues).map(([key, value]) => ({
      key,
      value
    }))

    for (const update of updates) {
      await updateSetting.mutateAsync(update)
    }

    setLocalValues({})
    toast.success('Configurações gerais salvas!')
  }

  const handleExport = () => {
    const data = settings?.reduce((acc, setting) => {
      acc[setting.key] = setting.value || ''
      return acc
    }, {} as Record<string, string>)

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bs-launch-settings.json'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast.success('Configurações exportadas!')
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string)
        setLocalValues(data)
        toast.success('Configurações importadas! Clique em Salvar para aplicar.')
      } catch (error) {
        toast.error('Erro ao importar configurações')
      }
    }
    reader.readAsText(file)
  }

  const hasChanges = Object.keys(localValues).length > 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Informações Básicas */}
      <Card>
        <CardHeader>
          <CardTitle>Informações da Aplicação</CardTitle>
          <CardDescription>
            Configure as informações básicas do sistema
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="app-name">Nome da Aplicação</Label>
            <Input
              id="app-name"
              type="text"
              placeholder="BS Launch Center"
              value={getValue('APP_NAME')}
              onChange={(e) => handleChange('APP_NAME', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="company-name">Nome da Empresa</Label>
            <Input
              id="company-name"
              type="text"
              placeholder="Blacksider Society"
              value={getValue('COMPANY_NAME')}
              onChange={(e) => handleChange('COMPANY_NAME', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="support-email">E-mail de Suporte</Label>
            <Input
              id="support-email"
              type="email"
              placeholder="suporte@blacksider.com"
              value={getValue('SUPPORT_EMAIL')}
              onChange={(e) => handleChange('SUPPORT_EMAIL', e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Configurações de Sistema */}
      <Card>
        <CardHeader>
          <CardTitle>Configurações do Sistema</CardTitle>
          <CardDescription>
            Ajuste o comportamento geral da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="timezone">Fuso Horário</Label>
            <Select
              value={getValue('TIMEZONE') || 'America/Sao_Paulo'}
              onValueChange={(value) => handleChange('TIMEZONE', value)}
            >
              <SelectTrigger id="timezone">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="America/Sao_Paulo">São Paulo (BRT)</SelectItem>
                <SelectItem value="America/New_York">New York (EST)</SelectItem>
                <SelectItem value="Europe/London">Londres (GMT)</SelectItem>
                <SelectItem value="Europe/Paris">Paris (CET)</SelectItem>
                <SelectItem value="Asia/Tokyo">Tokyo (JST)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-format">Formato de Data</Label>
            <Select
              value={getValue('DATE_FORMAT') || 'DD/MM/YYYY'}
              onValueChange={(value) => handleChange('DATE_FORMAT', value)}
            >
              <SelectTrigger id="date-format">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="items-per-page">Itens por Página</Label>
            <Input
              id="items-per-page"
              type="number"
              placeholder="25"
              value={getValue('ITEMS_PER_PAGE')}
              onChange={(e) => handleChange('ITEMS_PER_PAGE', e.target.value)}
              min={10}
              max={100}
              step={5}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="auto-refresh">Atualização Automática</Label>
              <p className="text-sm text-muted-foreground">
                Atualizar dados automaticamente em tempo real
              </p>
            </div>
            <Switch
              id="auto-refresh"
              checked={getValue('AUTO_REFRESH') === 'true'}
              onCheckedChange={(checked) => handleChange('AUTO_REFRESH', String(checked))}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="notifications">Notificações</Label>
              <p className="text-sm text-muted-foreground">
                Receber notificações de novos leads e eventos
              </p>
            </div>
            <Switch
              id="notifications"
              checked={getValue('ENABLE_NOTIFICATIONS') === 'true'}
              onCheckedChange={(checked) => handleChange('ENABLE_NOTIFICATIONS', String(checked))}
            />
          </div>
        </CardContent>
      </Card>

      {/* Backup e Restore */}
      <Card>
        <CardHeader>
          <CardTitle>Backup e Restauração</CardTitle>
          <CardDescription>
            Exporte ou importe suas configurações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleExport}>
              <Download className="mr-2 h-4 w-4" />
              Exportar Configurações
            </Button>
            <Button variant="outline" asChild>
              <label>
                <Upload className="mr-2 h-4 w-4" />
                Importar Configurações
                <input
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImport}
                />
              </label>
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            As configurações sensíveis (senhas e API keys) não são incluídas na exportação
          </p>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-2">
        <Button
          onClick={handleSave}
          disabled={updateSetting.isPending || !hasChanges}
        >
          {updateSetting.isPending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Salvar Alterações
            </>
          )}
        </Button>
      </div>
    </div>
  )
}