import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const { limit } = await request.json().catch(() => ({ limit: 10 }))
    const supabase = await createClient()
    const [groups, products] = await Promise.all([
      supabase.rpc('analytics_top_groups', { p_limit: limit || 10 }),
      supabase.rpc('analytics_top_products', { p_limit: limit || 10 }),
    ])
    if (groups.error) throw groups.error
    if (products.error) throw products.error
    return NextResponse.json({ groups: groups.data, products: products.data })
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Erro' }, { status: 500 })
  }
}


