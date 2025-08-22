import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { EvolutionV2Service } from '@/lib/services/evolution-v2'
import { settingsServerService } from '@/lib/services/settings-server'

function normalizeParticipant(input: string | null | undefined): string | null {
  if (!input) return null
  // casos como wpp-59991939243@unknown.local ou JIDs
  const base = input.split('@')[0]
  const cleaned = base.replace(/^wpp[-_]?/i, '')
  let digits = cleaned.replace(/\D/g, '')
  
  // Aplicar mesma lógica do banco: remover zeros à esquerda
  digits = digits.replace(/^0+/, '')
  
  // Se começa com 555 e tem 13 dígitos, remover um 5 (555XXXXXXXXX → 55XXXXXXXXX)
  if (digits.length === 13 && digits.startsWith('555')) {
    digits = '55' + digits.substring(3)
  }
  
  // Se tem 10-11 dígitos sem DDI, prefixar 55
  if ((digits.length === 10 || digits.length === 11) && !digits.startsWith('55')) {
    return '55' + digits
  }
  
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
      let participantJids: string[] = []
      try {
        const resp = await evolution.getGroupParticipants(instance.instance_name, group.group_jid)
        // Usar JID bruto para identidade canônica de WhatsApp
        participantJids = (resp.participants || [])
          .map((p: any) => (typeof p === 'string' ? p : (p?.id || '')))
          .filter(Boolean) as string[]
        participantJids = Array.from(new Set(participantJids))
      } catch (err) {
        console.error('Erro ao buscar participantes:', err)
        continue
      }

      if (participantJids.length === 0) {
        processed.push({ groupId: group.id, groupJid: group.group_jid, participants: 0, updated: 0 })
        continue
      }

      // Resolver/criar leads por whatsapp_jid (deduplicação canônica)
      const leads: any[] = []
      for (const jid of participantJids) {
        // Resolve ou cria lead por identidade (whatsapp_jid)
        let leadId: string | null = null
        try {
          const { data: rpc } = await supabase.rpc('find_or_create_lead_by_identity', { p_type: 'whatsapp_jid', p_value: jid, p_name: null, p_source: 'check_members' })
          if (typeof rpc === 'string') {
            leadId = rpc
          }
        } catch (e) {
          console.error('find_or_create_lead_by_identity error', e)
        }
        if (leadId) {
          leads.push({ id: leadId, whatsapp_jid: jid, nome: null, campaign_id: null, tags: [] })
        }
      }

      let updatedCount = 0
      const updatedLeadsForGroup: { id: string, nome: string | null, whatsapp_number: string | null, telefone: string | null, matched_number: string | null }[] = []
      for (const lead of (leads as any[] || [])) {
        // Atualizar lead: in_launch_group, tags, last_whatsapp_interaction
        const newTags = Array.isArray(lead.tags) ? Array.from(new Set([...(lead.tags || []), 'launch_group'])) : ['launch_group']
        const updatePayload: any = {
          in_launch_group: true,
          tags: newTags,
          last_whatsapp_interaction: new Date().toISOString()
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

        // Garantir membership ativa para este grupo
        try {
          await supabase
            .from('lead_group_memberships')
            .upsert({
              lead_id: lead.id,
              group_id: group.id,
              group_jid: group.group_jid,
              is_active: true,
              joined_at: new Date().toISOString(),
              left_at: null,
              source: 'reconcile',
              updated_at: new Date().toISOString()
            }, { onConflict: 'lead_id,group_jid' })
        } catch (mErr) {
          console.error('Erro ao upsert membership:', mErr)
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

      processed.push({ groupId: group.id, groupJid: group.group_jid, participants: participantJids.length, updated: updatedCount, leads: updatedLeadsForGroup })

      // Atualizar contagem do grupo
      try {
        await supabase
          .from('launch_groups')
          .update({ participant_count: participants.length, updated_at: new Date().toISOString() })
          .eq('id', group.id)
      } catch (cntErr) {
        console.error('Erro ao atualizar contagem do grupo:', cntErr)
      }
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


