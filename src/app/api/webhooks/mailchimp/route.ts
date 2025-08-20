import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { MailchimpService, MailchimpWebhookEvent } from '@/lib/services/mailchimp'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const mailchimp = new MailchimpService()
    
    // Obter o corpo da requisição como texto para validação de assinatura
    const bodyText = await request.text()
    
    // Validar assinatura do webhook (se configurado)
    const signature = request.headers.get('x-mailchimp-signature')
    const webhookSecret = process.env.MAILCHIMP_WEBHOOK_SECRET
    
    if (webhookSecret && signature) {
      const isValid = mailchimp.validateWebhookSignature(bodyText, signature, webhookSecret)
      if (!isValid) {
        console.error('Invalid Mailchimp webhook signature')
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    }
    
    // Parse do corpo
    const body = JSON.parse(bodyText)
    
    // Mailchimp pode enviar múltiplos eventos em uma requisição
    const events = Array.isArray(body) ? body : [body]
    
    for (const rawEvent of events) {
      const event = mailchimp.parseWebhookEvent(rawEvent)
      
      // Armazenar evento bruto no banco
      const { data: webhookEvent, error: insertError } = await supabase
        .from('webhook_events')
        .insert({
          source: 'mailchimp',
          event_type: event.type,
          event_id: `${event.type}_${event.data.id || event.data.email}_${event.fired_at}`,
          payload: event
        })
        .select()
        .single()
      
      if (insertError) {
        // Se for erro de duplicata, apenas pular
        if (insertError.code === '23505') {
          console.log(`Duplicate event ignored: ${event.type}`)
          continue
        }
        console.error('Error inserting webhook event:', insertError)
        continue
      }
      
      // Processar evento baseado no tipo
      try {
        let leadId: string | null = null
        let eventData: any = {}
        
        // Buscar lead pelo email
        if (event.data.email) {
          const { data: lead } = await supabase
            .from('leads')
            .select('id, mailchimp_subscriber_id')
            .eq('email', event.data.email)
            .single()
          
          if (lead) {
            leadId = lead.id
            
            // Atualizar subscriber_id se não estiver definido
            if (!lead.mailchimp_subscriber_id && event.data.id) {
              await supabase
                .from('leads')
                .update({ mailchimp_subscriber_id: event.data.id })
                .eq('id', lead.id)
            }
          }
        }
        
        // Processar eventos específicos
        switch (event.type) {
          case MailchimpService.WEBHOOK_EVENTS.EMAIL_OPENED:
            eventData = {
              campaign_id: event.data.campaign_id,
              ip: event.data.ip,
              timestamp: event.data.timestamp || event.fired_at
            }
            
            if (leadId) {
              // Aplicar scoring dinâmico
              const { data: scoringResult } = await supabase.rpc('apply_event_scoring', {
                p_lead_id: leadId,
                p_event_type: 'email_opened',
                p_campaign_id: event.data.campaign_id || null
              })
              
              // Atualizar última interação
              await supabase
                .from('leads')
                .update({ 
                  last_email_interaction: new Date().toISOString()
                })
                .eq('id', leadId)
            }
            break
          
          case MailchimpService.WEBHOOK_EVENTS.LINK_CLICKED:
            eventData = {
              campaign_id: event.data.campaign_id,
              url: event.data.url,
              ip: event.data.ip,
              timestamp: event.data.timestamp || event.fired_at
            }
            
            if (leadId) {
              // Aplicar scoring dinâmico
              const { data: scoringResult } = await supabase.rpc('apply_event_scoring', {
                p_lead_id: leadId,
                p_event_type: 'email_link_clicked',
                p_campaign_id: event.data.campaign_id || null
              })
              
              // Atualizar última interação
              await supabase
                .from('leads')
                .update({ 
                  last_email_interaction: new Date().toISOString()
                })
                .eq('id', leadId)
            }
            break
          
          case MailchimpService.WEBHOOK_EVENTS.EMAIL_BOUNCED:
            eventData = {
              campaign_id: event.data.campaign_id,
              reason: event.data.reason,
              timestamp: event.data.timestamp || event.fired_at
            }
            
            if (leadId) {
              // Aplicar scoring dinâmico (pontos negativos)
              const { data: scoringResult } = await supabase.rpc('apply_event_scoring', {
                p_lead_id: leadId,
                p_event_type: 'email_bounced',
                p_campaign_id: event.data.campaign_id || null
              })
              
              // Marcar email como inválido
              await supabase
                .from('leads')
                .update({ 
                  status: 'email_invalido'
                })
                .eq('id', leadId)
            }
            break
          
          case MailchimpService.WEBHOOK_EVENTS.UNSUBSCRIBE:
            if (leadId) {
              // Aplicar scoring dinâmico
              await supabase.rpc('apply_event_scoring', {
                p_lead_id: leadId,
                p_event_type: 'email_unsubscribed',
                p_campaign_id: event.data.campaign_id || null
              })
              
              await supabase
                .from('leads')
                .update({ 
                  status: 'descadastrado',
                  score: 0 // Zerar score para descadastrados
                })
                .eq('id', leadId)
            }
            break
        }
        
        // Marcar evento como processado
        await supabase
          .from('webhook_events')
          .update({ 
            processed: true,
            processed_at: new Date().toISOString(),
            lead_id: leadId
          })
          .eq('id', webhookEvent.id)
          
      } catch (processError: any) {
        console.error('Error processing webhook event:', processError)
        
        // Marcar evento com erro
        await supabase
          .from('webhook_events')
          .update({ 
            processed: false,
            error_message: processError.message
          })
          .eq('id', webhookEvent.id)
      }
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Mailchimp webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// Endpoint para verificar configuração do webhook (Mailchimp envia GET para validar)
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'ok',
    endpoint: 'mailchimp-webhook',
    configured: true
  })
}