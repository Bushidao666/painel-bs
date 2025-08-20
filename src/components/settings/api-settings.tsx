'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, CheckCircle, XCircle, Eye, EyeOff, TestTube } from 'lucide-react'
import { useAPISettings } from '@/hooks/use-settings'
import { toast } from 'sonner'

export function APISettings() {
  const {
    evolutionSettings,
    mailchimpSettings,
    updateSetting,
    testEvolution,
    testMailchimp,
    isLoading
  } = useAPISettings()

  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({})
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; message: string }>>({})
  const [localValues, setLocalValues] = useState<Record<string, string>>({})

  // Pegar valores locais ou do banco
  const getValue = (key: string) => {
    return localValues[key] ?? evolutionSettings?.find(s => s.key === key)?.value ?? 
           mailchimpSettings?.find(s => s.key === key)?.value ?? ''
  }

  const handleChange = (key: string, value: string) => {
    setLocalValues(prev => ({ ...prev, [key]: value }))
  }

  const handleSave = async (key: string) => {
    const value = getValue(key)
    await updateSetting.mutateAsync({ key, value })
    setLocalValues(prev => {
      const newValues = { ...prev }
      delete newValues[key]
      return newValues
    })
  }

  const handleTestEvolution = async () => {
    const url = getValue('EVOLUTION_API_URL')
    const apiKey = getValue('EVOLUTION_API_KEY')

    if (!url || !apiKey) {
      toast.error('Preencha URL e API Key do Evolution')
      return
    }

    const result = await testEvolution.mutateAsync({ url, apiKey })
    setTestResults(prev => ({ ...prev, evolution: result }))
    
    if (result.success) {
      toast.success('Conexão com Evolution API estabelecida!')
    } else {
      toast.error(result.message)
    }
  }

  const handleTestMailchimp = async () => {
    const apiKey = getValue('MAILCHIMP_API_KEY')
    const server = getValue('MAILCHIMP_SERVER')

    if (!apiKey || !server) {
      toast.error('Preencha API Key e Server do Mailchimp')
      return
    }

    const result = await testMailchimp.mutateAsync({ apiKey, server })
    setTestResults(prev => ({ ...prev, mailchimp: result }))
    
    if (result.success) {
      toast.success('Conexão com Mailchimp estabelecida!')
    } else {
      toast.error(result.message)
    }
  }

  const togglePasswordVisibility = (key: string) => {
    setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Evolution API */}
      <Card>
        <CardHeader>
          <CardTitle>Evolution API v2</CardTitle>
          <CardDescription>
            Configure a conexão com Evolution API para gerenciar WhatsApp
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="evolution-url">URL da API</Label>
            <Input
              id="evolution-url"
              type="url"
              placeholder="https://api.evolution.com.br"
              value={getValue('EVOLUTION_API_URL')}
              onChange={(e) => handleChange('EVOLUTION_API_URL', e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="evolution-key">API Key</Label>
            <div className="relative">
              <Input
                id="evolution-key"
                type={showPasswords['EVOLUTION_API_KEY'] ? 'text' : 'password'}
                placeholder="Sua API Key do Evolution"
                value={getValue('EVOLUTION_API_KEY')}
                onChange={(e) => handleChange('EVOLUTION_API_KEY', e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility('EVOLUTION_API_KEY')}
              >
                {showPasswords['EVOLUTION_API_KEY'] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {testResults.evolution && (
            <Alert variant={testResults.evolution.success ? 'default' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {testResults.evolution.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResults.evolution.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                handleSave('EVOLUTION_API_URL')
                handleSave('EVOLUTION_API_KEY')
              }}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestEvolution}
              disabled={testEvolution.isPending}
            >
              {testEvolution.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Mailchimp */}
      <Card>
        <CardHeader>
          <CardTitle>Mailchimp</CardTitle>
          <CardDescription>
            Configure a integração com Mailchimp para e-mail marketing
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="mailchimp-key">API Key</Label>
            <div className="relative">
              <Input
                id="mailchimp-key"
                type={showPasswords['MAILCHIMP_API_KEY'] ? 'text' : 'password'}
                placeholder="Sua API Key do Mailchimp"
                value={getValue('MAILCHIMP_API_KEY')}
                onChange={(e) => handleChange('MAILCHIMP_API_KEY', e.target.value)}
                className="pr-10"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3"
                onClick={() => togglePasswordVisibility('MAILCHIMP_API_KEY')}
              >
                {showPasswords['MAILCHIMP_API_KEY'] ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailchimp-server">Server Prefix</Label>
            <Input
              id="mailchimp-server"
              type="text"
              placeholder="us19, us20, etc"
              value={getValue('MAILCHIMP_SERVER')}
              onChange={(e) => handleChange('MAILCHIMP_SERVER', e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              O prefixo do servidor aparece na URL do Mailchimp (ex: us19.admin.mailchimp.com)
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="mailchimp-list">List ID (Audiência)</Label>
            <Input
              id="mailchimp-list"
              type="text"
              placeholder="ID da lista/audiência principal"
              value={getValue('MAILCHIMP_LIST_ID')}
              onChange={(e) => handleChange('MAILCHIMP_LIST_ID', e.target.value)}
            />
          </div>

          {testResults.mailchimp && (
            <Alert variant={testResults.mailchimp.success ? 'default' : 'destructive'}>
              <AlertDescription className="flex items-center gap-2">
                {testResults.mailchimp.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {testResults.mailchimp.message}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex gap-2">
            <Button
              onClick={() => {
                handleSave('MAILCHIMP_API_KEY')
                handleSave('MAILCHIMP_SERVER')
                handleSave('MAILCHIMP_LIST_ID')
              }}
              disabled={updateSetting.isPending}
            >
              {updateSetting.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar Configurações'
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleTestMailchimp}
              disabled={testMailchimp.isPending}
            >
              {testMailchimp.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Testando...
                </>
              ) : (
                <>
                  <TestTube className="mr-2 h-4 w-4" />
                  Testar Conexão
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}