import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

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
      console.warn('Evolution API não está configurada, deletando apenas do banco de dados')
    } else {
      const evolution = new EvolutionV2Service(evolutionConfig)

      // Verificar existência e estado da instância na Evolution
      let instanceExists = true
      let state: 'open' | 'close' | 'connecting' | null = null
      try {
        const st = await evolution.getConnectionState(instanceName)
        state = st.state
      } catch (err: any) {
        const msg = String(err?.message || '')
        if (msg.includes('does not exist') || msg.includes('Not Found')) {
          instanceExists = false
          console.info(`Instância ${instanceName} não existe na Evolution; prosseguindo com remoção local.`)
        } else {
          console.warn('Falha ao consultar estado na Evolution (continua):', msg)
        }
      }

      // Se existir e estiver conectada, tentar logout
      if (instanceExists && state === 'open') {
        try {
          await evolution.logoutInstance(instanceName)
          console.log(`Logout realizado para instância ${instanceName}`)
        } catch (logoutError: any) {
          const msg = String(logoutError?.message || '')
          if (msg.includes('not connected')) {
            console.info(`Instância ${instanceName} já não estava conectada na Evolution.`)
          } else {
            console.warn('Erro ao fazer logout (continua):', msg)
          }
        }
      }

      // Tentar deletar na Evolution se existir
      if (instanceExists) {
        try {
          await evolution.deleteInstance(instanceName)
          console.log(`Instância ${instanceName} deletada da Evolution API`)
        } catch (deleteError: any) {
          const msg = String(deleteError?.message || '')
          if (msg.includes('does not exist') || msg.includes('Not Found')) {
            console.info(`Instância ${instanceName} já não existia na Evolution.`)
          } else {
            console.warn('Erro ao deletar na Evolution (continua):', msg)
          }
        }
      }
    }

    // Deletar do banco
    const { error } = await supabase
      .from('whatsapp_instances')
      .delete()
      .eq('instance_name', instanceName)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao deletar instância:', error)
    return NextResponse.json(
      { error: 'Erro ao deletar instância' },
      { status: 500 }
    )
  }
}