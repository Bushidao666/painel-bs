import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action, status = 'review', limit = 100, id } = await request.json().catch(() => ({ action: 'refresh' }))
    const supabase = await createClient()
    if (action === 'refresh') {
      const { data: ing, error: ingErr } = await supabase.rpc('ingest_identities_from_leads')
      if (ingErr) throw ingErr
      const { data, error } = await supabase.rpc('refresh_lead_merge_candidates', { p_limit: 20000 })
      if (error) throw error
      const { data: proc, error: pErr } = await supabase.rpc('process_lead_merge_candidates', { p_threshold_auto: 0.98, p_threshold_review: 0.85 })
      if (pErr) throw pErr
      return NextResponse.json({ ingested: ing, refreshed: data, processed: proc })
    }
    if (action === 'list') {
      const { data, error } = await supabase.rpc('list_merge_candidates', { p_status: status, p_limit: limit })
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'accept' && id) {
      const { error } = await supabase.rpc('accept_merge_candidate', { p_id: id })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    if (action === 'reject' && id) {
      const { error } = await supabase.rpc('reject_merge_candidate', { p_id: id })
      if (error) throw error
      return NextResponse.json({ ok: true })
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}
