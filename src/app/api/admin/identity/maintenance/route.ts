import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'report' }))
    const supabase = await createClient()
    if (action === 'merge_phone') {
      const { data, error } = await supabase.rpc('leads_merge_by_phone_commit')
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'refresh_candidates') {
      const { data, error } = await supabase.rpc('refresh_lead_merge_candidates', { p_limit: 20000 })
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'process_candidates') {
      const { data, error } = await supabase.rpc('process_lead_merge_candidates', { p_threshold_auto: 0.98, p_threshold_review: 0.85 })
      if (error) throw error
      return NextResponse.json(data)
    }
    // report
    const { data, error } = await supabase.rpc('analytics_unique_phone_summary')
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


