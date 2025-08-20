import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

function onlyDigits(input: string | null | undefined): string | null {
  if (!input) return null
  const digits = input.replace(/\D/g, '')
  return digits || null
}

export async function POST(request: NextRequest) {
  try {
    const { instanceId, groupIds }: { instanceId: string, groupIds?: string[] } = await request.json()
    if (!instanceId) {
      return NextResponse.json({ error: 'instanceId é obrigatório' }, { status: 400 })
    }

    const supabase = await createClient()

    // Buscar configs Evolution
    const evolutionConfig = await settingsServerService.getEvolutionConfig()
    if (!evolutionConfig.apiUrl || !evolutionConfig.apiKey) {
      return NextResponse.json({ error: 'Evolution API não configurada' }, { status: 400 })
    }
    const evolution = new EvolutionV2Service(evolutionConfig)

    // Buscar instância e grupos
    const { data: instance } = await supabase
      .from('whatsapp_instances')
      .select('*')
      .eq('id', instanceId)
      .single()

    if (!instance) {
      return NextResponse.json({ error: 'Instância não encontrada' }, { status: 404 })
    }

    const groupsQuery = supabase
      .from('launch_groups')
      .select('*')
      .eq('instance_id', instanceId)

    const { data: allGroups, error: groupsError } = groupIds?.length
      ? await groupsQuery.in('id', groupIds)
      : await groupsQuery.eq('is_launch_group', true)

    if (groupsError) throw groupsError

    const processed = [] as any[]
    const foundLeads: { id: string, nome: string | null, whatsapp_number: string | null }[] = []

    for (const group of allGroups || []) {
      // Buscar participantes do grupo
      let participants: string[] = []
      try {
        const resp = await evolution.getGroupParticipants(instance.instance_name, group.group_jid)
        // Normalização dos números dos participantes (JID -> dígitos)
        participants = (resp.participants || [])
          .map((p: any) => onlyDigits(p.id)!)
          .filter(Boolean) as string[]
        // Heurísticas para aumentar match: adicionar variantes com/sem 55 e últimos 11 dígitos
        const variants = new Set<string>()
        for (const n of participants) {
          variants.add(n)
          variants.add(n.replace(/^0+/, ''))
          if (/^\d{11}$/.test(n) && !n.startsWith('55')) variants.add('55' + n)
          if (n.length > 11) variants.add(n.slice(-11))
        }
        participants = Array.from(variants)
      } catch (err) {
        console.error('Erro ao buscar participantes:', err)
        continue
      }

      if (participants.length === 0) {
        processed.push({ groupId: group.id, groupJid: group.group_jid, participants: 0, updated: 0 })
        continue
      }

      // Buscar leads por whatsapp_number (normalizando via função SQL para performance)
      const { data: leads } = await supabase
        .rpc('match_leads_by_numbers', { p_numbers: participants })

      let updatedCount = 0
      const updatedLeadsForGroup: { id: string, nome: string | null, whatsapp_number: string | null, telefone: string | null, matched_number: string | null }[] = []
      for (const lead of (leads as any[] || [])) {
        // Atualizar lead: in_launch_group, tags, last_whatsapp_interaction
        const newTags = Array.isArray(lead.tags) ? Array.from(new Set([...(lead.tags || []), 'launch_group'])) : ['launch_group']
        const normalize = (v: string | null) => v ? v.replace(/\D/g, '') : null
        const matched = normalize(lead.whatsapp_number) || normalize(lead.telefone) || null

        const updatePayload: any = {
          in_launch_group: true,
          tags: newTags,
          last_whatsapp_interaction: new Date().toISOString()
        }
        if ((!lead.whatsapp_number || lead.whatsapp_number.trim() === '') && matched) {
          updatePayload.whatsapp_number = matched
        }

        const { error: updErr } = await supabase
          .from('leads')
          .update(updatePayload)
          .eq('id', lead.id)

        if (updErr) {
          console.error('Erro ao atualizar lead:', updErr)
          continue
        }

        // Aplicar scoring via regra configurada (dinâmica via scoring_rules)
        try {
          await supabase.rpc('apply_event_scoring', {
            p_lead_id: lead.id,
            p_event_type: 'whatsapp_joined_group',
            p_campaign_id: lead.campaign_id || null
          })
        } catch (e) {
          console.error('Erro ao aplicar scoring:', e)
        }

        updatedCount++
        const leadObj = { 
          id: lead.id, 
          nome: lead.nome || null, 
          whatsapp_number: lead.whatsapp_number || null,
          telefone: lead.telefone || null,
          matched_number: matched
        }
        foundLeads.push(leadObj)
        updatedLeadsForGroup.push(leadObj)
      }

      processed.push({ groupId: group.id, groupJid: group.group_jid, participants: participants.length, updated: updatedCount, leads: updatedLeadsForGroup })
    }

    // Log geral
    await supabase.from('sync_logs').insert({
      service: 'evolution',
      status: 'success',
      data_synced: {
        action: 'check-members',
        instance_id: instanceId,
        groups: (allGroups || []).length,
        leads_updated: foundLeads.length,
        processed
      }
    })

    return NextResponse.json({ success: true, leadsUpdated: foundLeads.length, details: processed })
  } catch (error: any) {
    console.error('Erro ao identificar leads nos grupos:', error)
    return NextResponse.json({ error: error.message || 'Erro ao identificar leads' }, { status: 500 })
  }
}


