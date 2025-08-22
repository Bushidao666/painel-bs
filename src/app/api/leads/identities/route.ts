import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { action } = await request.json().catch(() => ({ action: 'ingest' }))
    const supabase = await createClient()
    if (action === 'ingest') {
      const { data, error } = await supabase.rpc('ingest_identities_from_leads')
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'assign_by_email') {
      const { data, error } = await supabase.rpc('assign_related_by_email')
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'merge_by_email_preview') {
      const { data, error } = await supabase.rpc('leads_merge_by_email_preview')
      if (error) throw error
      return NextResponse.json(data)
    }
    if (action === 'merge_by_email_commit') {
      const { data, error } = await supabase.rpc('leads_merge_by_email_commit')
      if (error) throw error
      return NextResponse.json(data)
    }
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


