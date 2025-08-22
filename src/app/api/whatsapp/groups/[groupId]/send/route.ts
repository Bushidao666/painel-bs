import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

export async function POST(request: NextRequest) {
  try {
    const url = new URL(request.url)
    const groupId = url.pathname.split('/').slice(-2, -1)[0]
    const { text, mediaUrl, mediaType } = await request.json()
    
    if (!text && !mediaUrl) {
      return NextResponse.json(
        { error: 'Texto ou mídia é obrigatório' },
        { status: 400 }
      )
    }

    const supabase = await createClient()
    
    // Buscar configurações da Evolution
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    
    if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
      return NextResponse.json(
        { error: 'Evolution API não está configurada' },
        { status: 400 }
      )
    }
    
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Buscar informações do grupo
    const { data: group, error: groupError } = await supabase
      .from('launch_groups')
      .select('*, whatsapp_instances!inner(*)')
      .eq('id', groupId)
      .single()

    if (groupError || !group) {
      return NextResponse.json(
        { error: 'Grupo não encontrado' },
        { status: 404 }
      )
    }

    const instanceName = group.whatsapp_instances.instance_name
    const groupJid = group.group_jid

    // Verificar se a instância está conectada
    if (group.whatsapp_instances.status !== 'connected') {
      return NextResponse.json(
        { error: 'Instância WhatsApp não está conectada' },
        { status: 400 }
      )
    }

    let response
    
    if (mediaUrl) {
      // Enviar mídia
      response = await evolution.sendMedia(
        instanceName,
        groupJid,
        mediaUrl,
        mediaType || 'image',
        {
          caption: text,
          delay: 1000
        }
      )
    } else {
      // Enviar apenas texto
      response = await evolution.sendText(
        instanceName,
        groupJid,
        text,
        {
          delay: 1000
        }
      )
    }

    // Registrar o envio no banco (opcional - para histórico)
    await supabase
      .from('launch_groups')
      .update({ 
        last_message_at: new Date().toISOString(),
        metadata: {
          ...group.metadata,
          last_message: text?.substring(0, 100) // Primeiros 100 chars
        }
      })
      .eq('id', groupId)

    return NextResponse.json({
      success: true,
      messageId: response.key?.id || response.id,
      response
    })
  } catch (error: any) {
    console.error('Erro ao enviar mensagem para o grupo:', error)
    return NextResponse.json(
      { 
        error: 'Erro ao enviar mensagem',
        details: error.message 
      },
      { status: 500 }
    )
  }
}