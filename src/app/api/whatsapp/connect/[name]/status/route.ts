import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  try {
    const { name } = await params
    const instanceName = (name || '').trim()
    const supabase = await createClient()
    
    // Buscar configurações da Evolution do banco de dados
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Verificar status na Evolution
    let status: 'connected' | 'disconnected' | 'connecting' = 'disconnected'
    let connectionState
    try {
      connectionState = await evolution.getConnectionState(instanceName)
      status = connectionState.state === 'open' ? 'connected' : (connectionState.state as any)
    } catch (e: any) {
      // Se a instância não existir na Evolution, marcar como desconectada no banco e retornar
      if (String(e?.message || '').includes('does not exist')) {
        await supabase
          .from('whatsapp_instances')
          .update({ status: 'disconnected', phone_number: null, connected_at: null })
          .eq('instance_name', instanceName)
        return NextResponse.json({ status: 'disconnected', phoneNumber: null })
      }
      throw e
    }

    // Se conectado, buscar informações do perfil
    let phoneNumber = null
    if (status === 'connected') {
      try {
        const profile = await evolution.fetchProfile(instanceName)
        phoneNumber = profile.wuid
      } catch (error) {
        console.error('Erro ao buscar perfil:', error)
      }
    }

    // Atualizar no banco
    const updateData: any = {
      status,
      updated_at: new Date().toISOString()
    }

    if (status === 'connected') {
      updateData.connected_at = new Date().toISOString()
      updateData.qr_code = null
      updateData.qr_code_expires_at = null
      if (phoneNumber) {
        updateData.phone_number = phoneNumber
      }
    } else if (status === 'disconnected') {
      updateData.connected_at = null
      updateData.phone_number = null
    }

    await supabase
      .from('whatsapp_instances')
      .update(updateData)
      .eq('instance_name', instanceName)

    return NextResponse.json({ 
      status,
      phoneNumber 
    })
  } catch (error) {
    console.error('Erro ao verificar status:', error)
    return NextResponse.json(
      { error: 'Erro ao verificar status' },
      { status: 500 }
    )
  }
}