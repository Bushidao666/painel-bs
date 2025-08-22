import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'preview' }))
    const supabase = await createClient()
    if (action === 'preview') {
      const { data, error } = await supabase.rpc('leads_merge_by_phone_preview')
      if (error) throw error
      const { data: summary, error: sErr } = await supabase.rpc('analytics_unique_phone_summary')
      if (sErr) throw sErr
      return NextResponse.json({ duplicates: data, summary })
    } else if (action === 'commit') {
      const { data, error } = await supabase.rpc('leads_merge_by_phone_commit')
      if (error) throw error
      // reatribuir relacionamentos por telefone
      const { data: assigned, error: aErr } = await supabase.rpc('assign_related_by_phone')
      if (aErr) throw aErr
      return NextResponse.json({ merged: data, assigned })
    } else if (action === 'assign_only') {
      const { data, error } = await supabase.rpc('assign_related_by_phone')
      if (error) throw error
      return NextResponse.json({ assigned: data })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


