import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Buscar configurações da Evolution do banco de dados
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    
    // Validar se a Evolution API está configurada
    if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
      console.warn('Evolution API não está configurada')
      // Continuar sem sincronizar com a Evolution
      const { data: dbInstances } = await supabase
        .from('whatsapp_instances')
        .select('*')
        .order('created_at', { ascending: false })
      return NextResponse.json(dbInstances || [])
    }
    
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Buscar instâncias do banco
    const { data: dbInstances, error } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Buscar status real das instâncias na Evolution API
    try {
      const evolutionInstances = await evolution.fetchInstances()
      
      // Atualizar status no banco
      for (const dbInstance of dbInstances || []) {
        const evolutionInstance = evolutionInstances.find(
          ei => ei.instanceName === dbInstance.instance_name
        )
        
        if (evolutionInstance) {
          const connectionState = await evolution.getConnectionState(dbInstance.instance_name)
          const newStatus = connectionState.state === 'open' ? 'connected' : 'disconnected'
          
          if (newStatus !== dbInstance.status) {
            await supabase
              .from('whatsapp_instances')
              .update({ 
                status: newStatus,
                connected_at: newStatus === 'connected' ? new Date().toISOString() : null
              })
              .eq('id', dbInstance.id)
          }
        }
      }
    } catch (evolutionError) {
      console.error('Erro ao buscar instâncias da Evolution:', evolutionError)
    }

    // Buscar instâncias atualizadas
    const { data: updatedInstances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false })

    return NextResponse.json(updatedInstances || [])
  } catch (error) {
    console.error('Erro ao buscar instâncias:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar instâncias' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { instanceName } = await request.json()
    
    if (!instanceName) {
      return NextResponse.json(
        { error: 'Nome da instância é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Buscar configurações da Evolution do banco de dados
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    
    // Validar se a Evolution API está configurada
    if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
      return NextResponse.json(
        { error: 'Evolution API não está configurada. Configure a URL e a chave de API nas configurações do sistema.' },
        { status: 400 }
      )
    }
    
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Verificar se já existe
    const { data: existing } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('instance_name', instanceName)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma instância com este nome' },
        { status: 400 }
      )
    }

    // Obter URL do projeto Supabase para o webhook
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhagsydidweninjvbeae.supabase.co'
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`
    
    console.log('Configurando webhook:', webhookUrl)
    
    // Criar instância na Evolution API (sem webhook) e configurar webhook via endpoint dedicado
    try {
      const evolutionResponse = await evolution.createInstance(instanceName)
      console.log('Instância criada na Evolution API:', evolutionResponse)

      // Configurar webhook separadamente
      try {
        const webhookResp = await evolution.configureInstanceWebhook(instanceName, {
          url: webhookUrl,
          webhook_by_events: true,
          webhook_base64: false,
          events: [
            // Status e QR
            'QRCODE_UPDATED',
            'CONNECTION_UPDATE',
            // Mensagens
            'MESSAGES_UPSERT',
            'MESSAGES_UPDATE',
            // Eventos de grupos (cobrir variações de nomenclatura)
            'GROUP_PARTICIPANTS_UPDATE',
            'group-participants.update',
            'group.participant_changed',
            'GROUPS_UPDATE',
            'groups.update',
            'group.update',
            'COMMUNITY_UPDATE',
            'community.update'
          ]
        })
        console.log('Webhook configurado na Evolution API:', webhookResp)
      } catch (webhookErr: any) {
        console.error('Falha ao configurar webhook na Evolution API:', webhookErr?.message || webhookErr)
        // Não bloquear a criação da instância por falha no webhook
      }
    } catch (evolutionError: any) {
      console.error('Erro detalhado ao criar instância na Evolution:', {
        error: evolutionError.message,
        instanceName,
        apiUrl: evolutionConfig.apiUrl
      })
      
      // Se falhar na Evolution API, retornar erro em vez de continuar
      return NextResponse.json(
        { 
          error: `Erro ao criar instância na Evolution API: ${evolutionError.message}`,
          details: 'Verifique se a URL e API Key estão corretas nas configurações.'
        },
        { status: 500 }
      )
    }

    // Salvar no banco
    const { data: newInstance, error } = await supabase
      .from('whatsapp_instances')
      .insert({
        instance_name: instanceName,
        status: 'disconnected'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Disparar sincronização de grupos em segundo plano imediatamente após criação
    try {
      const origin = new URL(request.url).origin
      // Não aguarda a resposta
      fetch(`${origin}/api/whatsapp/groups/sync/${newInstance.id}`, { method: 'POST' }).catch(() => {})
    } catch {}

    return NextResponse.json(newInstance)
  } catch (error) {
    console.error('Erro ao criar instância:', error)
    return NextResponse.json(
      { error: 'Erro ao criar instância' },
      { status: 500 }
    )
  }
}

// Ao acessar a lista, opcionalmente sincronizar grupos automaticamente se "autoSync" query param estiver presente
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const url = new URL(request.url)
    const autoSync = url.searchParams.get('autoSync') === 'true'

    const { data: dbInstances } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .order('created_at', { ascending: false })

    if (autoSync && dbInstances?.length) {
      // Disparar sync de grupos em background por instância conectada
      const base = process.env.NEXT_PUBLIC_BASE_URL || ''
      for (const inst of dbInstances) {
        if (inst.status === 'connected' && inst.id) {
          fetch(`${base}/api/whatsapp/groups/sync/${inst.id}`, { method: 'POST' }).catch(() => {})
        }
      }
    }

    return NextResponse.json(dbInstances || [])
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao listar instâncias' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { instanceName } = await request.json()
    if (!instanceName) {
      return NextResponse.json({ error: 'instanceName é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 })
    }

    // Verificar se instância existe
    const { data: exists } = await supabase
      .from('whatsapp_instances')
      .select('id')
      .eq('instance_name', instanceName)
      .maybeSingle()

    if (!exists) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    const evolution = new EvolutionV2Service(evolutionConfig)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://hhagsydidweninjvbeae.supabase.co'
    const webhookUrl = `${supabaseUrl}/functions/v1/evolution-webhook`

    const resp = await evolution.configureInstanceWebhook(instanceName, {
      url: webhookUrl,
      webhook_by_events: true,
      webhook_base64: false,
      events: [
        'QRCODE_UPDATED',
        'CONNECTION_UPDATE',
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'GROUP_PARTICIPANTS_UPDATE',
        'group-participants.update',
        'group.participant_changed',
        'GROUPS_UPDATE',
        'groups.update',
        'group.update',
        'COMMUNITY_UPDATE',
        'community.update'
      ]
    })

    return NextResponse.json({ success: true, result: resp })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro ao reconfigurar webhook' }, { status: 500 })
  }
}