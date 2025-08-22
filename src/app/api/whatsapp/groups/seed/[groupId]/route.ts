import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ groupId: string }> }
) {
  try {
    const { groupId } = await params
    const supabase = await createClient()

    // Buscar group_jid e instance
    const { data: group, error: groupError } = await supabase
      .from('launch_groups')
      .select('id, group_jid, instance_id, whatsapp_instances:instance_id ( instance_name )')
      .eq('id', groupId)
      .maybeSingle()

    if (groupError || !group) {
      return NextResponse.json({ error: 'Grupo não encontrado' }, { status: 404 })
    }

    const instanceName = (group as any)?.whatsapp_instances?.instance_name
    if (!instanceName || !group.group_jid) {
      return NextResponse.json({ error: 'Dados insuficientes do grupo' }, { status: 400 })
    }

    // Invocar Edge Function com SRK para evitar problemas de JWT (verify_jwt)
    // Invocar Edge Function via admin client (evita dependência de base URL em dev)
    try {
      const admin = createAdminClient()
      const { data, error } = await admin.functions.invoke('sync-launch-groups', {
        body: { instanceName, groupJid: group.group_jid }
      })
      if (error) {
        return NextResponse.json({ error: error.message || 'Falha ao reconciliar grupo' }, { status: 500 })
      }
      return NextResponse.json({ success: true, result: data })
    } catch (e: any) {
      return NextResponse.json({ error: e.message || 'Falha ao invocar função' }, { status: 500 })
    }
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno' }, { status: 500 })
  }
}


