import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    await request.json().catch(() => ({}))
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('analytics_summary', { p_campaign_id: null })
    if (error) throw error
    // enriquecer com visão canônica por telefone
    const { data: phoneSummary, error: pErr } = await supabase.rpc('analytics_unique_phone_summary')
    if (pErr) throw pErr
    const enriched = {
      ...data,
      phoneSummary
    }
    return NextResponse.json(enriched)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


