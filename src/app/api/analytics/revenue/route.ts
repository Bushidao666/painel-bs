import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { days } = await request.json().catch(() => ({ days: 30 }))
    const supabase = await createClient()
    const { data, error } = await supabase.rpc('analytics_daily_revenue', { p_days: days || 30 })
    if (error) throw error
    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


