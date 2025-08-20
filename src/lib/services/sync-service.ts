import { createClient } from '@/lib/supabase/client'

interface SyncResult {
  leadId: string
  success: boolean
  error?: string
  data?: any
}

class SyncService {
  private supabase = createClient()

  /**
   * Sincroniza dados do Evolution API para um lead específico
   */
  async syncLeadEvolution(leadId: string, whatsappNumber?: string, groupId?: string): Promise<SyncResult> {
    try {
      // Se não tem número do WhatsApp, buscar do lead
      if (!whatsappNumber) {
        const { data: lead } = await this.supabase
          .from('leads')
          .select('telefone, whatsapp_number')
          .eq('id', leadId)
          .single()
        
        whatsappNumber = lead?.whatsapp_number || lead?.telefone
        if (!whatsappNumber) {
          return {
            leadId,
            success: false,
            error: 'Lead não tem número de WhatsApp'
          }
        }
      }

      // Chamar Edge Function
      const { data, error } = await this.supabase.functions.invoke('sync-evolution-data', {
        body: {
          leadId,
          whatsappNumber,
          groupId
        }
      })

      if (error) throw error

      return {
        leadId,
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar Evolution:', error)
      return {
        leadId,
        success: false,
        error: error.message || 'Erro ao sincronizar Evolution'
      }
    }
  }

  /**
   * Sincroniza dados do Mailchimp para um lead específico
   */
  async syncLeadMailchimp(leadId: string, email?: string): Promise<SyncResult> {
    try {
      // Se não tem email, buscar do lead
      if (!email) {
        const { data: lead } = await this.supabase
          .from('leads')
          .select('email, mailchimp_subscriber_id')
          .eq('id', leadId)
          .single()
        
        email = lead?.email
        if (!email) {
          return {
            leadId,
            success: false,
            error: 'Lead não tem email'
          }
        }
      }

      // Chamar Edge Function
      const { data, error } = await this.supabase.functions.invoke('sync-mailchimp-data', {
        body: {
          leadId,
          email
        }
      })

      if (error) throw error

      return {
        leadId,
        success: true,
        data
      }
    } catch (error: any) {
      console.error('Erro ao sincronizar Mailchimp:', error)
      return {
        leadId,
        success: false,
        error: error.message || 'Erro ao sincronizar Mailchimp'
      }
    }
  }

  /**
   * Sincroniza um lead completo (Evolution + Mailchimp)
   */
  async syncLead(leadId: string): Promise<{
    evolution: SyncResult
    mailchimp: SyncResult
  }> {
    // Buscar dados do lead
    const { data: lead } = await this.supabase
      .from('leads')
      .select('*')
      .eq('id', leadId)
      .single()

    if (!lead) {
      const errorResult = {
        leadId,
        success: false,
        error: 'Lead não encontrado'
      }
      return {
        evolution: errorResult,
        mailchimp: errorResult
      }
    }

    // Sincronizar em paralelo
    const [evolutionResult, mailchimpResult] = await Promise.all([
      this.syncLeadEvolution(leadId, lead.whatsapp_number || lead.telefone),
      this.syncLeadMailchimp(leadId, lead.email)
    ])

    return {
      evolution: evolutionResult,
      mailchimp: mailchimpResult
    }
  }

  /**
   * Sincroniza todos os leads ativos
   */
  async syncAllLeads(campaignId?: string): Promise<{
    total: number
    success: number
    failed: number
    errors: Array<{ leadId: string; error: string }>
  }> {
    try {
      // Buscar leads ativos
      let query = this.supabase
        .from('leads')
        .select('id, email, telefone, whatsapp_number')
        .neq('status', 'inativo')

      if (campaignId) {
        query = query.eq('campaign_id', campaignId)
      }

      const { data: leads, error } = await query

      if (error) throw error
      if (!leads || leads.length === 0) {
        return { total: 0, success: 0, failed: 0, errors: [] }
      }

      const results = {
        total: leads.length,
        success: 0,
        failed: 0,
        errors: [] as Array<{ leadId: string; error: string }>
      }

      // Processar em lotes para não sobrecarregar
      const batchSize = 10
      for (let i = 0; i < leads.length; i += batchSize) {
        const batch = leads.slice(i, i + batchSize)
        
        const batchResults = await Promise.all(
          batch.map(lead => this.syncLead(lead.id))
        )

        batchResults.forEach((result, index) => {
          const lead = batch[index]
          
          // Verificar sucesso de ambas sincronizações
          const evolutionSuccess = result.evolution.success
          const mailchimpSuccess = result.mailchimp.success
          
          if (evolutionSuccess || mailchimpSuccess) {
            results.success++
          } else {
            results.failed++
            results.errors.push({
              leadId: lead.id,
              error: result.evolution.error || result.mailchimp.error || 'Erro desconhecido'
            })
          }
        })
      }

      return results
    } catch (error: any) {
      console.error('Erro ao sincronizar todos os leads:', error)
      throw error
    }
  }

  /**
   * Busca último log de sincronização
   */
  async getLastSyncLog(leadId?: string, service?: 'evolution' | 'mailchimp' | 'all'): Promise<any> {
    let query = this.supabase
      .from('sync_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)

    if (leadId) {
      query = query.eq('lead_id', leadId)
    }

    if (service) {
      query = query.eq('service', service)
    }

    const { data, error } = await query

    if (error) throw error
    return data?.[0] || null
  }

  /**
   * Busca estatísticas de sincronização
   */
  async getSyncStats(hours = 24): Promise<{
    totalSyncs: number
    successfulSyncs: number
    failedSyncs: number
    lastSync: string | null
  }> {
    const since = new Date()
    since.setHours(since.getHours() - hours)

    const { data, error } = await this.supabase
      .from('sync_logs')
      .select('status, created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })

    if (error) throw error

    const stats = {
      totalSyncs: data?.length || 0,
      successfulSyncs: data?.filter(log => log.status === 'success').length || 0,
      failedSyncs: data?.filter(log => log.status === 'error').length || 0,
      lastSync: data?.[0]?.created_at || null
    }

    return stats
  }
}

export const syncService = new SyncService()