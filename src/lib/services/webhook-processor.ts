import { createClient } from '@/lib/supabase/server'
import { MailchimpService } from './mailchimp'

export interface ProcessorResult {
  success: boolean
  leadId?: string
  eventsCreated: number
  scoreChange: number
  error?: string
}

export interface EventRule {
  event_type: string
  score_points: number
  temperature_change?: 'cold' | 'warm' | 'hot'
  status_change?: string
}

export class WebhookProcessor {

  async processWebhookEvent(webhookEventId: string): Promise<ProcessorResult> {
    const supabase = await createClient()
    const result: ProcessorResult = {
      success: false,
      eventsCreated: 0,
      scoreChange: 0
    }
    
    try {
      // Buscar evento do webhook
      const { data: webhookEvent, error } = await supabase
        .from('webhook_events')
        .select('*')
        .eq('id', webhookEventId)
        .single()
      
      if (error || !webhookEvent) {
        throw new Error('Webhook event not found')
      }
      
      // Se já foi processado, retornar
      if (webhookEvent.processed) {
        result.success = true
        return result
      }
      
      // Processar baseado na origem
      if (webhookEvent.source === 'mailchimp') {
        return await this.processMailchimpEvent(webhookEvent)
      } else if (webhookEvent.source === 'evolution') {
        return await this.processEvolutionEvent(webhookEvent)
      }
      
      throw new Error(`Unknown webhook source: ${webhookEvent.source}`)
      
    } catch (error: any) {
      result.error = error.message
      return result
    }
  }

  private async processMailchimpEvent(webhookEvent: any): Promise<ProcessorResult> {
    const supabase = await createClient()
    const result: ProcessorResult = {
      success: false,
      eventsCreated: 0,
      scoreChange: 0
    }
    
    try {
      const payload = webhookEvent.payload
      const email = payload.data?.email
      
      if (!email) {
        throw new Error('Email not found in payload')
      }
      
      // Buscar lead
      const { data: lead, error: leadError } = await supabase
        .from('leads')
        .select('*')
        .eq('email', email)
        .single()
      
      if (leadError || !lead) {
        throw new Error('Lead not found')
      }
      
      result.leadId = lead.id
      
      // Determinar tipo de evento e processar
      let eventType = ''
      let metadata: any = {}
      
      switch (payload.type) {
        case 'open':
          eventType = 'email_opened'
          metadata = {
            campaign_id: payload.data.campaign_id,
            ip: payload.data.ip,
            timestamp: payload.fired_at
          }
          break
        
        case 'click':
          eventType = 'email_link_clicked'
          metadata = {
            campaign_id: payload.data.campaign_id,
            url: payload.data.url,
            ip: payload.data.ip,
            timestamp: payload.fired_at
          }
          break
        
        case 'bounce':
          eventType = 'email_bounced'
          metadata = {
            campaign_id: payload.data.campaign_id,
            reason: payload.data.reason,
            timestamp: payload.fired_at
          }
          break
        
        case 'unsubscribe':
          eventType = 'email_unsubscribed'
          metadata = {
            timestamp: payload.fired_at
          }
          break
      }
      
      if (eventType) {
        // Aplicar scoring dinâmico usando função do banco
        const { data: scoreApplied } = await supabase.rpc('apply_event_scoring', {
          p_lead_id: lead.id,
          p_event_type: eventType,
          p_campaign_id: lead.campaign_id || null
        })
        
        result.eventsCreated++
        result.scoreChange = scoreApplied || 0
        
        // Atualizar última interação
        await supabase
          .from('leads')
          .update({
            last_email_interaction: new Date().toISOString()
          })
          .eq('id', lead.id)
        
        // Atualizar status especiais baseado no tipo de evento
        if (eventType === 'email_bounced') {
          await supabase
            .from('leads')
            .update({ status: 'email_invalido' })
            .eq('id', lead.id)
        } else if (eventType === 'email_unsubscribed') {
          await supabase
            .from('leads')
            .update({ 
              status: 'descadastrado',
              score: 0
            })
            .eq('id', lead.id)
        }
      }
      
      // Marcar como processado
      await supabase
        .from('webhook_events')
        .update({ 
          processed: true,
          processed_at: new Date().toISOString(),
          lead_id: lead.id
        })
        .eq('id', webhookEvent.id)
      
      result.success = true
      return result
      
    } catch (error: any) {
      result.error = error.message
      
      // Marcar com erro
      await supabase
        .from('webhook_events')
        .update({ 
          processed: false,
          error_message: error.message
        })
        .eq('id', webhookEvent.id)
      
      return result
    }
  }

  private async processEvolutionEvent(webhookEvent: any): Promise<ProcessorResult> {
    const supabase = await createClient()
    const result: ProcessorResult = {
      success: false,
      eventsCreated: 0,
      scoreChange: 0
    }
    
    try {
      const payload = webhookEvent.payload
      
      // Lógica específica já está implementada no webhook endpoint
      // Este método pode ser usado para reprocessamento ou lógica adicional
      
      // Marcar como processado
      await supabase
        .from('webhook_events')
        .update({ 
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', webhookEvent.id)
      
      result.success = true
      return result
      
    } catch (error: any) {
      result.error = error.message
      return result
    }
  }

  // Método para detectar múltiplas aberturas de email
  async detectMultipleOpens(leadId: string, timeframeDays: number = 7): Promise<boolean> {
    const supabase = await createClient()
    
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - timeframeDays)
    
    const { data: events, error } = await supabase
      .from('lead_events')
      .select('*')
      .eq('lead_id', leadId)
      .eq('event_type', 'email_opened')
      .gte('created_at', cutoffDate.toISOString())
      .order('created_at', { ascending: false })
    
    if (error || !events) {
      return false
    }
    
    // Agrupar por campaign_id
    const campaignOpens = new Map<string, number>()
    events.forEach(event => {
      const campaignId = event.metadata?.campaign_id
      if (campaignId) {
        campaignOpens.set(campaignId, (campaignOpens.get(campaignId) || 0) + 1)
      }
    })
    
    // Verificar se alguma campanha teve múltiplas aberturas
    for (const [campaignId, count] of campaignOpens) {
      if (count >= 3) {
        // Buscar dados do lead para pegar campaign_id
        const { data: lead } = await supabase
          .from('leads')
          .select('campaign_id')
          .eq('id', leadId)
          .single()
        
        // Aplicar scoring dinâmico para múltiplas aberturas
        await supabase.rpc('apply_event_scoring', {
          p_lead_id: leadId,
          p_event_type: 'email_multiple_opens',
          p_campaign_id: lead?.campaign_id || null
        })
        
        // Atualizar temperatura para warm/hot baseado na quantidade
        const temperatura = count >= 5 ? 'hot' : 'warm'
        await supabase
          .from('leads')
          .update({ temperatura })
          .eq('id', leadId)
        
        return true
      }
    }
    
    return false
  }

  // Método para recalcular score de um lead baseado em todos os eventos
  async recalculateLeadScore(leadId: string): Promise<number> {
    const supabase = await createClient()
    
    // Buscar todos os eventos do lead
    const { data: events, error } = await supabase
      .from('lead_events')
      .select('event_type, created_at')
      .eq('lead_id', leadId)
      .order('created_at', { ascending: true })
    
    if (error || !events) {
      return 0
    }
    
    // Usar função do banco para recalcular com regras dinâmicas
    const { data: newScore } = await supabase.rpc('recalculate_lead_score_with_rules', {
      p_lead_id: leadId
    })
    
    return newScore || 0
  }
}