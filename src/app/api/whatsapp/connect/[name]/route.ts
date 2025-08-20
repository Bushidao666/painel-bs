import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: instanceName } = await params
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

    // Gerar QR Code
    const qrResponse = await evolution.getQRCode(instanceName)
    console.log('QR Response da Evolution:', qrResponse)
    
    // A Evolution V2 pode retornar { code, base64, pairingCode, count }
    // Normalizar para sempre retornar um valor utilizável no frontend
    let qrCode: string | null = null
    if (qrResponse?.code) {
      // QR em formato textual (string) para gerar com react-qr-code
      qrCode = qrResponse.code
    } else if (qrResponse?.base64) {
      // Pode vir já com prefixo data URI ou apenas o base64 cru
      const raw = qrResponse.base64
      qrCode = raw.startsWith('data:image') ? raw : `data:image/png;base64,${raw}`
    } else if (qrResponse?.pairingCode) {
      // Fallback: alguns ambientes entregam apenas pairingCode
      qrCode = qrResponse.pairingCode
    }

    // Se já estiver conectado, normalizar estado e não retornar erro
    if (!qrCode) {
      const maybeState = (qrResponse as any)?.instance?.state
      if (maybeState === 'open') {
        // Atualizar status como conectado e limpar QR no banco
        await supabase
          .from('whatsapp_instances')
          .update({
            status: 'connected',
            connected_at: new Date().toISOString(),
            qr_code: null,
            qr_code_expires_at: null
          })
          .eq('instance_name', instanceName)
        return NextResponse.json({ alreadyConnected: true })
      }

      console.error('QR Code não foi gerado pela Evolution API:', qrResponse)
      return NextResponse.json(
        { error: 'QR Code não foi gerado. Verifique se a instância existe na Evolution API.' },
        { status: 500 }
      )
    }

    // Atualizar status no banco
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'qr_code',
        qr_code: qrCode,
        qr_code_expires_at: new Date(Date.now() + 30000).toISOString() // 30 segundos
      })
      .eq('instance_name', instanceName)

    return NextResponse.json({ qrCode })
  } catch (error) {
    console.error('Erro ao conectar instância:', error)
    return NextResponse.json(
      { error: 'Erro ao gerar QR Code' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name: instanceName } = await params
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

    // Desconectar da Evolution
    await evolution.logoutInstance(instanceName)

    // Atualizar status no banco
    await supabase
      .from('whatsapp_instances')
      .update({
        status: 'disconnected',
        phone_number: null,
        qr_code: null,
        connected_at: null
      })
      .eq('instance_name', instanceName)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao desconectar:', error)
    return NextResponse.json(
      { error: 'Erro ao desconectar' },
      { status: 500 }
    )
  }
}