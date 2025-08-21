import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Tipos de eventos do Evolution API
export interface EvolutionWebhookEvent {
  instance: string
  event: string
  data: any
  destination?: string
  date_time?: string
  sender?: string
  server_url?: string
  apikey?: string
}

// Eventos suportados
const EVOLUTION_EVENTS = {
  // Mensagens
  MESSAGES_SET: 'messages.set',
  MESSAGES_UPSERT: 'messages.upsert',
  MESSAGES_UPDATE: 'messages.update',
  MESSAGES_DELETE: 'messages.delete',
  SEND_MESSAGE: 'send.message',
  
  // Grupos
  GROUPS_UPSERT: 'groups.upsert',
  GROUPS_UPDATE: 'groups.update', 
  GROUP_PARTICIPANTS_UPDATE: 'group-participants.update',
  
  // Presença
  PRESENCE_UPDATE: 'presence.update',
  
  // Conexão
  CONNECTION_UPDATE: 'connection.update',
  QRCODE_UPDATED: 'qrcode.updated'
}

export async function POST(request: NextRequest) {
  // DEPRECATED: Este endpoint foi substituído pela Edge Function do Supabase `evolution-webhook`.
  // Garanta que o webhook da Evolution aponte para: `${SUPABASE_URL}/functions/v1/evolution-webhook`
  return NextResponse.json(
    { error: 'Deprecated endpoint. Use Supabase Edge Function evolution-webhook.' },
    { status: 410 }
  )
  try {
    const supabase = await createClient()
    
    // Validar API key (se configurado)
    const apiKey = request.headers.get('apikey')
    const expectedApiKey = process.env.EVOLUTION_WEBHOOK_API_KEY
    
    if (expectedApiKey && apiKey !== expectedApiKey) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const event: EvolutionWebhookEvent = await request.json()
    
    // Armazenar evento bruto
    const { data: webhookEvent, error: insertError } = await supabase
      .from('webhook_events')
      .insert({
        source: 'evolution',
        event_type: event.event,
        event_id: `${event.instance}_${event.event}_${Date.now()}`,
        payload: event
      })
      .select()
      .single()
    
    if (insertError) {
      // Se for erro de duplicata, apenas pular
      if ((insertError as any).code === '23505') {
        console.log(`Duplicate event ignored: ${event.event}`)
        return NextResponse.json({ success: true })
      }
      console.error('Error inserting webhook event:', insertError)
      return NextResponse.json({ error: 'Database error' }, { status: 500 })
    }
    
    // Processar eventos específicos
    try {
      let leadId: string | null = null
      let processedData: any = {}
      
      switch (event.event) {
        case EVOLUTION_EVENTS.MESSAGES_UPSERT:
          // Nova mensagem recebida ou enviada
          const message = event.data
          const isFromMe = message.key?.fromMe || false
          const remoteJid = message.key?.remoteJid
          
          if (!isFromMe && remoteJid) {
            // Mensagem recebida - verificar se é de um lead
            const phoneNumber = remoteJid.split('@')[0]
            
            // Buscar lead pelo número do WhatsApp
            const { data: lead } = await supabase
              .from('leads')
              .select('id, score, in_launch_group, campaign_id')
              .eq('whatsapp_number', phoneNumber)
              .single()
            
            if (lead) {
              leadId = (lead as any).id
              
              // Verificar se é mensagem de grupo
              const isGroupMessage = remoteJid.includes('@g.us')
              
              if (isGroupMessage) {
                // Aplicar scoring dinâmico para mensagem em grupo
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: leadId as string,
                  p_event_type: 'whatsapp_group_message',
                  p_campaign_id: (lead as any).campaign_id || null
                })
                
                // Atualizar última interação
                await supabase
                  .from('leads')
                  .update({ 
                    last_whatsapp_interaction: new Date().toISOString()
                  })
                  .eq('id', leadId)
              } else {
                // Aplicar scoring dinâmico para resposta de mensagem
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: leadId as string,
                  p_event_type: 'whatsapp_message_replied',
                  p_campaign_id: (lead as any).campaign_id || null
                })
                
                // Atualizar última interação e temperatura
                await supabase
                  .from('leads')
                  .update({ 
                    last_whatsapp_interaction: new Date().toISOString(),
                    temperatura: 'warm' // Atualizar temperatura
                  })
                  .eq('id', leadId)
              }
            }
          }
          break
        
        case EVOLUTION_EVENTS.MESSAGES_UPDATE:
          // Atualização de mensagem (lida, entregue, etc)
          const update = event.data
          
          // Verificar se é uma confirmação de leitura
          if (update.update?.status === 'READ' || update.update?.status === 3) {
            const remoteJid = update.key?.remoteJid
            
            if (remoteJid) {
              const phoneNumber = remoteJid.split('@')[0]
              const isGroupMessage = remoteJid.includes('@g.us')
              
              // Buscar lead
              const { data: lead } = await supabase
                .from('leads')
                .select('id, score, campaign_id')
                .eq('whatsapp_number', phoneNumber)
                .single()
              
              if (lead) {
                leadId = (lead as any).id
                
                const eventType = isGroupMessage ? 'whatsapp_group_message_read' : 'whatsapp_message_read'
                
                // Aplicar scoring dinâmico
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: leadId as string,
                  p_event_type: eventType,
                  p_campaign_id: (lead as any).campaign_id || null
                })
                
                // Atualizar última interação
                await supabase
                  .from('leads')
                  .update({ 
                    last_whatsapp_interaction: new Date().toISOString()
                  })
                  .eq('id', leadId)
              }
            }
          }
          break
        
        case EVOLUTION_EVENTS.GROUP_PARTICIPANTS_UPDATE:
          // Atualização de participantes do grupo
          const groupUpdate = event.data
          const action = groupUpdate.action // 'add', 'remove', 'promote', 'demote'
          const participants = groupUpdate.participants || []
          const groupJid = groupUpdate.groupJid
          
          if (action === 'add') {
            // Novos participantes adicionados ao grupo
            for (const participant of participants) {
              const phoneNumber = participant.split('@')[0]
              
              // Buscar lead
              const { data: lead } = await supabase
                .from('leads')
                .select('id, score, campaign_id')
                .eq('whatsapp_number', phoneNumber)
                .single()
              
              if (lead) {
                // Aplicar scoring dinâmico para entrada no grupo
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: (lead as any).id as string,
                  p_event_type: 'whatsapp_joined_group',
                  p_campaign_id: (lead as any).campaign_id || null
                })
                
                // Atualizar status
                await supabase
                  .from('leads')
                  .update({ 
                    in_launch_group: true,
                    last_whatsapp_interaction: new Date().toISOString(),
                    temperatura: 'hot' // Atualizar para hot
                  })
                  .eq('id', (lead as any).id)
                
                // Verificar se é um grupo de lançamento específico
                const { data: launchGroup } = await supabase
                  .from('launch_groups')
                  .select('id, is_launch_group')
                  .eq('group_jid', groupJid)
                  .eq('is_launch_group', true)
                  .single()
                
                if (launchGroup) {
                  // Incrementar contador de participantes
                  await supabase.rpc('increment', {
                    table_name: 'launch_groups',
                    column_name: 'participant_count',
                    row_id: (launchGroup as any).id as string
                  })
                }
              }
            }
          } else if (action === 'remove') {
            // Participantes removidos do grupo
            for (const participant of participants) {
              const phoneNumber = participant.split('@')[0]
              
              const { data: lead } = await supabase
                .from('leads')
                .select('id, campaign_id')
                .eq('whatsapp_number', phoneNumber)
                .single()
              
              if (lead) {
                // Aplicar scoring dinâmico para saída do grupo
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: (lead as any).id as string,
                  p_event_type: 'whatsapp_left_group',
                  p_campaign_id: (lead as any).campaign_id || null
                })
                
                // Atualizar status
                await supabase
                  .from('leads')
                  .update({ 
                    in_launch_group: false
                  })
                  .eq('id', (lead as any).id)
              }
            }
          }
          break
        
        case EVOLUTION_EVENTS.PRESENCE_UPDATE:
          // Atualização de presença (online, digitando)
          const presence = event.data
          const phoneNumber = presence.id?.split('@')[0]
          
          if (phoneNumber && presence.presences) {
            const { data: lead } = await supabase
              .from('leads')
              .select('id')
              .eq('whatsapp_number', phoneNumber)
              .single()
            
            if (lead) {
              const presenceStatus = Object.values(presence.presences)[0] as any
              
              if (presenceStatus?.lastKnownPresence === 'composing') {
                // Aplicar scoring dinâmico para digitando
                await supabase.rpc('apply_event_scoring', {
                  p_lead_id: (lead as any).id as string,
                  p_event_type: 'whatsapp_typing',
                  p_campaign_id: (lead as any).campaign_id || null
                })
              }
            }
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
      console.error('Error processing Evolution webhook:', processError)
      
      // Marcar evento com erro
      await supabase
        .from('webhook_events')
        .update({ 
          processed: false,
          error_message: processError.message
        })
        .eq('id', webhookEvent.id)
    }
    
    return NextResponse.json({ success: true })
    
  } catch (error: any) {
    console.error('Evolution webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

// GET endpoint para verificação de saúde
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    status: 'deprecated',
    message: 'Use Supabase Edge Function evolution-webhook',
    endpoint: 'api/webhooks/evolution (deprecated)',
    supportedEvents: Object.values(EVOLUTION_EVENTS)
  }, { status: 410 })
}