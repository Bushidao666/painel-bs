import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ instanceId: string }> }
) {
  try {
    const { instanceId } = await params
    const supabase = await createClient()
    
    // Buscar configurações da Evolution do banco de dados
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Buscar instância
    const { data: instance, error: instanceError } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (instanceError || !instance) {
      return NextResponse.json(
        { error: 'Instância não encontrada' },
        { status: 404 }
      )
    }

    if (instance.status !== 'connected') {
      return NextResponse.json(
        { error: 'Instância não está conectada' },
        { status: 400 }
      )
    }

    // Buscar grupos da Evolution
    const groups = await evolution.fetchAllGroups(instance.instance_name, true)

    // Salvar/atualizar grupos no banco
    let syncedCount = 0
    for (const group of groups) {
      // Enriquecer com informações de comunidade, se disponíveis
      let communityName: string | null = null
      let communityId: string | null = null
      try {
        const info: any = await evolution.getGroupInfo(instance.instance_name, group.id)
        // Tentativas de campos comuns para comunidade
        communityName = info?.community?.subject || info?.parent?.subject || null
        communityId = info?.community?.id || info?.parent?.id || null
      } catch {}

      const groupData = {
        instance_id: instanceId,
        group_jid: group.id,
        group_name: group.subject || 'Sem nome',
        group_description: group.desc || null,
        participant_count: group.participants?.length || group.size || 0,
        metadata: {
          owner: group.owner,
          creation: group.creation,
          restrict: group.restrict,
          announce: group.announce,
          community_name: communityName,
          community_id: communityId
        }
      }

      const { error } = await supabase
        .from('launch_groups')
        .upsert(groupData, {
          onConflict: 'instance_id,group_jid'
        })

      if (!error) {
        syncedCount++
      }
    }

    // Atualizar última sincronização
    await supabase
      .from('whatsapp_instances')
      .update({ last_sync: new Date().toISOString() })
      .eq('id', instanceId)

    // Disparar reconciliação de lançamento em segundo plano via admin client
    try {
      const admin = createAdminClient()
      await admin.functions.invoke('sync-launch-groups', { body: { instanceName: instance.instance_name } })
    } catch {}

    return NextResponse.json({ success: true, groupsCount: syncedCount, totalGroups: groups.length })
  } catch (error) {
    console.error('Erro ao sincronizar grupos:', error)
    return NextResponse.json(
      { error: 'Erro ao sincronizar grupos' },
      { status: 500 }
    )
  }
}