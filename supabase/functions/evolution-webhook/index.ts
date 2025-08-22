import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookEvent {
  event: string
  instance: string
  instanceName?: string
  data?: {
    key?: {
      remoteJid?: string
      fromMe?: boolean
      id?: string
    }
    pushName?: string
    message?: any
    messageType?: string
    messageTimestamp?: number
    owner?: string
    profilePictureUrl?: string
    profileName?: string
    profileStatus?: string
    jid?: string
    statusCode?: number
    state?: string
    status?: string
  }
  destination?: string
  date_time?: string
  sender?: string
  server_url?: string
  apikey?: string
}

// Mapear eventos da Evolution API para status do banco
function mapEventToStatus(event: string, data?: any): string | null {
  switch (event) {
    case 'connection.update':
      // Evolution V2 envia o status no data.state
      if (data?.state === 'open' || data?.statusCode === 200) {
        return 'connected'
      } else if (data?.state === 'close') {
        return 'disconnected'
      } else if (data?.state === 'connecting') {
        return 'connecting'
      }
      break
    
    case 'qrcode.updated':
    case 'qrcode':
      return 'qr_code'
    
    case 'instance.connected':
    case 'ready':
      return 'connected'
    
    case 'instance.disconnected':
    case 'logout':
      return 'disconnected'
    
    case 'connection.qrcode':
      return 'qr_code'
    
    default:
      console.log(`Evento não mapeado: ${event}`)
      return null
  }
  
  return null
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validar API Key se configurada
    const apiKey = Deno.env.get('WEBHOOK_API_KEY')
    if (apiKey) {
      const authHeader = req.headers.get('x-api-key') || req.headers.get('apikey')
      if (authHeader !== apiKey) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { 
            status: 401,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Parse webhook payload
    const webhookData: WebhookEvent = await req.json()
    console.log('Webhook recebido:', {
      event: webhookData.event,
      instance: webhookData.instance || webhookData.instanceName,
      state: webhookData.data?.state,
      statusCode: webhookData.data?.statusCode
    })

    // Conectar ao Supabase
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Determinar o nome da instância
    const instanceName = webhookData.instance || webhookData.instanceName
    if (!instanceName) {
      console.error('Nome da instância não encontrado no webhook')
      return new Response(
        JSON.stringify({ error: 'Instance name not found' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Mapear evento para status
    const newStatus = mapEventToStatus(webhookData.event, webhookData.data)
    
    if (newStatus) {
      // Preparar dados para atualização
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString()
      }

      // Se conectado, salvar informações do perfil
      if (newStatus === 'connected' && webhookData.data) {
        if (webhookData.data.jid || webhookData.data.owner) {
          updateData.phone_number = webhookData.data.jid || webhookData.data.owner
        }
        if (webhookData.data.profileName) {
          updateData.metadata = {
            profileName: webhookData.data.profileName,
            profilePictureUrl: webhookData.data.profilePictureUrl,
            profileStatus: webhookData.data.profileStatus
          }
        }
        updateData.connected_at = new Date().toISOString()
      }

      // Se desconectado, limpar dados de conexão
      if (newStatus === 'disconnected') {
        updateData.phone_number = null
        updateData.qr_code = null
        updateData.qr_code_expires_at = null
        updateData.connected_at = null
      }

      // Se QR Code, salvar o código (se disponível)
      if (newStatus === 'qr_code' && webhookData.data?.message) {
        updateData.qr_code = webhookData.data.message
        updateData.qr_code_expires_at = new Date(Date.now() + 30000).toISOString() // 30 segundos
      }

      // Atualizar no banco
      const { error } = await supabase
        .from('whatsapp_instances')
        .update(updateData)
        .eq('instance_name', instanceName)

      if (error) {
        console.error('Erro ao atualizar instância:', error)
        return new Response(
          JSON.stringify({ error: 'Failed to update instance', details: error }),
          { 
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }

      console.log(`Instância ${instanceName} atualizada para status: ${newStatus}`)
    }

    // Processar eventos de grupo para taguear leads automaticamente
    if (webhookData.event === 'group.participant_changed' || webhookData.event === 'group.update' || webhookData.event === 'community.update') {
      try {
        const action = (webhookData.data as any)?.action // 'add' | 'remove' | 'promote' | 'demote'
        const rawParticipants = (webhookData.data as any)?.participants || []
        const groupJid = (webhookData.data as any)?.groupJid || (webhookData.data as any)?.jid

        const toDigits = (v: string | undefined | null) => {
          if (!v) return null
          let digits = v.replace(/\D/g, '')
          // Aplicar mesma lógica do banco
          digits = digits.replace(/^0+/, '')
          // Se começa com 555 e tem 13 dígitos, remover um 5
          if (digits.length === 13 && digits.startsWith('555')) {
            digits = '55' + digits.substring(3)
          }
          // Se tem 10-11 dígitos sem DDI, prefixar 55
          if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
            return '55' + digits
          }
          return digits || null
        }

        const participantIds: string[] = rawParticipants
          .map((p: any) => typeof p === 'string' ? p : (p?.id || p))
          .filter(Boolean)
          .map((id: string) => toDigits(id?.split('@')[0])!)
          .filter(Boolean)

        if (participantIds.length === 0) {
          console.log('Sem participantes para processar no evento de grupo')
        } else {
          // Buscar leads que correspondem aos números
          const { data: leads } = await supabase
            .from('leads')
            .select('id, campaign_id, tags, in_launch_group')
            .in('whatsapp_number', participantIds)

          for (const lead of leads || []) {
            if (action === 'add') {
              // Atualizar flags e tags
              const newTags = Array.isArray(lead.tags) ? Array.from(new Set([...(lead.tags || []), 'launch_group'])) : ['launch_group']
              await supabase
                .from('leads')
                .update({
                  in_launch_group: true,
                  tags: newTags,
                  last_whatsapp_interaction: new Date().toISOString()
                })
                .eq('id', lead.id)

              // Aplicar scoring configurado para joined group
              await supabase.rpc('apply_event_scoring', {
                p_lead_id: lead.id,
                p_event_type: 'whatsapp_joined_group',
                p_campaign_id: lead.campaign_id || null
              })
            } else if (action === 'remove') {
              await supabase
                .from('leads')
                .update({ in_launch_group: false })
                .eq('id', lead.id)

              await supabase.rpc('apply_event_scoring', {
                p_lead_id: lead.id,
                p_event_type: 'whatsapp_left_group',
                p_campaign_id: lead.campaign_id || null
              })
            }
          }

          // Atualizar contagem básica do grupo se existir em launch_groups
          if (groupJid) {
            // Não falhar em caso de erro
            await supabase
              .from('launch_groups')
              .update({ participant_count: participantIds.length, updated_at: new Date().toISOString() })
              .eq('group_jid', groupJid)
          }
        }
      } catch (groupErr) {
        console.error('Erro ao processar evento de grupo:', groupErr)
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        event: webhookData.event,
        instance: instanceName,
        status: newStatus 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    )
  } catch (error) {
    console.error('Erro no webhook:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})