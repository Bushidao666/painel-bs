import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { group_jid, limit = 50, page = 1 } = await request.json()
    if (!group_jid) return NextResponse.json({ error: 'group_jid é obrigatório' }, { status: 400 })
    const supabase = await createClient()
    const from = (page - 1) * limit
    const to = from + limit - 1
    const query = supabase
      .from('lead_group_memberships_active')
      .select('lead_id, group_jid, group_name, leads!inner(id, nome, phone)', { count: 'exact' })
      .eq('group_jid', group_jid)
      .order('lead_id', { ascending: true })
      .range(from, to)

    const { data, error, count } = await query
    if (error) throw error
    return NextResponse.json({ data, count })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


