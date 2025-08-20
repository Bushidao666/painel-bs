import { createClient } from '@/lib/supabase/server'

export interface Setting {
  id: string
  key: string
  value: string | null
  category: string
  label: string
  description: string | null
  type: 'text' | 'password' | 'url' | 'number' | 'boolean' | 'select'
  is_required: boolean
  is_encrypted: boolean
  validation_regex: string | null
  placeholder: string | null
  options: any
  updated_at: string
  updated_by: string | null
}

export interface SettingsByCategory {
  [category: string]: Setting[]
}

class SettingsServerService {
  private cache: Map<string, any> = new Map()

  // Buscar todas as configurações
  async getAllSettings(): Promise<Setting[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .order('category', { ascending: true })
      .order('label', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Buscar configurações por categoria
  async getSettingsByCategory(category: string): Promise<Setting[]> {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('category', category)
      .order('label', { ascending: true })

    if (error) throw error
    return data || []
  }

  // Buscar uma configuração específica
  async getSetting(key: string): Promise<Setting | null> {
    // Verificar cache primeiro
    if (this.cache.has(key)) {
      return this.cache.get(key)
    }

    const supabase = await createClient()
    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('key', key)
      .single()

    if (error && error.code !== 'PGRST116') throw error
    
    if (data) {
      this.cache.set(key, data)
    }
    
    return data
  }

  // Buscar valor de uma configuração
  async getValue(key: string): Promise<string | null> {
    const setting = await this.getSetting(key)
    return setting?.value || null
  }

  // Atualizar configuração
  async updateSetting(key: string, value: string): Promise<Setting> {
    try {
      const supabase = await createClient()
      
      // Pegar usuário atual
      const { data: { user } } = await supabase.auth.getUser()
      
      const { data, error } = await supabase
        .from('app_settings')
        .update({ 
          value,
          updated_at: new Date().toISOString(),
          updated_by: user?.email || user?.id || 'system'
        })
        .eq('key', key)
        .select()
        .single()

      if (error) {
        console.error('Erro ao atualizar configuração:', error)
        throw new Error(error.message || 'Erro ao atualizar configuração')
      }
      
      // Limpar cache
      this.cache.delete(key)
      
      return data
    } catch (error: any) {
      console.error('Erro no updateSetting:', error)
      throw new Error(error?.message || 'Erro ao atualizar configuração')
    }
  }

  // Atualizar múltiplas configurações
  async updateMultipleSettings(settings: { key: string; value: string }[]): Promise<void> {
    const promises = settings.map(({ key, value }) => 
      this.updateSetting(key, value)
    )
    
    await Promise.all(promises)
    
    // Limpar todo o cache
    this.cache.clear()
  }

  // Validar configuração
  validateSetting(setting: Setting, value: string): { valid: boolean; error?: string } {
    // Verificar se é obrigatório
    if (setting.is_required && !value) {
      return { valid: false, error: 'Campo obrigatório' }
    }

    // Validar por tipo
    switch (setting.type) {
      case 'url':
        try {
          new URL(value)
        } catch {
          return { valid: false, error: 'URL inválida' }
        }
        break
      
      case 'number':
        if (value && isNaN(Number(value))) {
          return { valid: false, error: 'Deve ser um número' }
        }
        break
      
      case 'boolean':
        if (value && !['true', 'false', '0', '1'].includes(value)) {
          return { valid: false, error: 'Valor booleano inválido' }
        }
        break
    }

    // Validar com regex customizado
    if (setting.validation_regex && value) {
      const regex = new RegExp(setting.validation_regex)
      if (!regex.test(value)) {
        return { valid: false, error: 'Formato inválido' }
      }
    }

    return { valid: true }
  }

  // Testar conexão Evolution API
  async testEvolutionConnection(url: string, apiKey: string): Promise<{ success: boolean; message: string }> {
    try {
      // Limpar e validar URL
      const cleanUrl = url.replace(/\/$/, '').replace(/\/+/g, '/')
      
      // Validar formato da URL
      try {
        new URL(cleanUrl)
      } catch {
        return { success: false, message: 'URL inválida. Use o formato: https://dominio.com' }
      }

      const response = await fetch(`${cleanUrl}/instance/fetchInstances`, {
        headers: {
          'apikey': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        return { success: true, message: 'Conexão estabelecida com sucesso!' }
      } else {
        return { success: false, message: `Erro: ${response.status} - ${response.statusText}` }
      }
    } catch (error: any) {
      return { success: false, message: error.message || 'Erro ao conectar com Evolution API' }
    }
  }

  // Testar conexão Mailchimp
  async testMailchimpConnection(apiKey: string, server: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await fetch(`https://${server}.api.mailchimp.com/3.0/ping`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        return { success: true, message: data.health_status || 'Conexão estabelecida com sucesso!' }
      } else {
        return { success: false, message: `Erro: ${response.status} - ${response.statusText}` }
      }
    } catch (error) {
      return { success: false, message: 'Erro ao conectar com Mailchimp' }
    }
  }

  // Exportar configurações (sem dados sensíveis)
  async exportSettings(): Promise<any> {
    const settings = await this.getAllSettings()
    
    return settings
      .filter(s => !s.is_encrypted)
      .reduce((acc, setting) => {
        acc[setting.key] = setting.value
        return acc
      }, {} as any)
  }

  // Importar configurações
  async importSettings(data: Record<string, string>): Promise<void> {
    const settings = Object.entries(data).map(([key, value]) => ({
      key,
      value: String(value)
    }))
    
    await this.updateMultipleSettings(settings)
  }

  // Resetar para valores padrão
  async resetToDefaults(category?: string): Promise<void> {
    const defaultValues: Record<string, string> = {
      'SCORE_EMAIL_OPEN': '5',
      'SCORE_EMAIL_CLICK': '10',
      'SCORE_GROUP_JOIN': '25',
      'SCORE_WHATSAPP_READ': '15',
      'SCORE_WHATSAPP_REPLY': '20',
      'SCORE_HOT_THRESHOLD': '70',
      'SCORE_WARM_THRESHOLD': '40',
      'APP_NAME': 'BS Launch Center',
      'COMPANY_NAME': 'Blacksider Society'
    }

    let settings = Object.entries(defaultValues)
    
    if (category) {
      const categorySettings = await this.getSettingsByCategory(category)
      settings = settings.filter(([key]) => 
        categorySettings.some(s => s.key === key)
      )
    }
    
    await this.updateMultipleSettings(
      settings.map(([key, value]) => ({ key, value }))
    )
  }

  // Limpar cache
  clearCache() {
    this.cache.clear()
  }

  // Buscar configurações da Evolution API
  async getEvolutionConfig(): Promise<{ apiUrl: string; apiKey: string }> {
    const [urlSetting, keySetting] = await Promise.all([
      this.getSetting('EVOLUTION_API_URL'),
      this.getSetting('EVOLUTION_API_KEY')
    ])

    const apiUrl = urlSetting?.value || process.env.NEXT_PUBLIC_EVOLUTION_API_URL || ''
    const apiKey = keySetting?.value || process.env.NEXT_PUBLIC_EVOLUTION_API_KEY || ''

    // Garantir que a URL não termine com barra
    const cleanUrl = apiUrl.replace(/\/$/, '')

    return { apiUrl: cleanUrl, apiKey }
  }

  // Buscar configurações do Mailchimp
  async getMailchimpConfig(): Promise<{ apiKey: string; server: string; listId: string }> {
    const [keySetting, serverSetting, listSetting] = await Promise.all([
      this.getSetting('MAILCHIMP_API_KEY'),
      this.getSetting('MAILCHIMP_SERVER'),
      this.getSetting('MAILCHIMP_LIST_ID')
    ])

    return {
      apiKey: keySetting?.value || '',
      server: serverSetting?.value || '',
      listId: listSetting?.value || ''
    }
  }
}

export const settingsServerService = new SettingsServerService()