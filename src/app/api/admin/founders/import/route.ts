import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()
    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    const contentType = request.headers.get('content-type') || ''
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json({ error: 'Envie como multipart/form-data' }, { status: 400 })
    }

    const form = await request.formData()
    const file = form.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'Arquivo ausente' }, { status: 400 })

    const text = await file.text()
    const parsed = Papa.parse(text, { header: true, skipEmptyLines: true })
    if (parsed.errors?.length) {
      return NextResponse.json({ error: 'Erro no CSV', details: parsed.errors }, { status: 400 })
    }

    const rows = (parsed.data as any[])
      .map((r) => r)
      .filter((r) => r && (r.Email || r.Nome || r.Telefone))

    // Importar em lotes
    const chunkSize = 1000
    let total = 0
    let inserted = 0
    let updated = 0
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { data: res, error } = await supabase.rpc('upsert_founder_members_json', { arr: chunk })
      if (error) {
        return NextResponse.json({ error: error.message, at: { from: i, to: i + chunk.length } }, { status: 400 })
      }
      if (res && typeof res === 'object') {
        total += Number(res.total ?? chunk.length)
        inserted += Number(res.inserted ?? 0)
        updated += Number(res.updated ?? 0)
      } else {
        total += chunk.length
      }
    }

    // Vincular a leads
    const { data: linkData, error: linkErr } = await supabase.rpc('link_founder_members_to_leads')
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message, total, inserted, updated }, { status: 400 })
    }

    const summary = (linkData && linkData[0]) || { linked: 0, created: 0 }
    return NextResponse.json({ success: true, total, inserted, updated, ...summary })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao importar founders' }, { status: 500 })
  }
}


