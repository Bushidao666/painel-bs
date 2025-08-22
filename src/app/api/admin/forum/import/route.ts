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

    const rows = (parsed.data as any[]).map((r) => r)

    // Import em lotes para evitar payloads muito grandes
    const chunkSize = 1000
    let imported = 0
    for (let i = 0; i < rows.length; i += chunkSize) {
      const chunk = rows.slice(i, i + chunkSize)
      const { error: upErr } = await supabase.rpc('upsert_forum_members_json', { arr: chunk })
      if (upErr) {
        return NextResponse.json({ error: upErr.message, at: { from: i, to: i + chunk.length } }, { status: 400 })
      }
      imported += chunk.length
    }

    // Link após importação
    const { data: linkData, error: linkErr } = await supabase.rpc('link_forum_members_to_leads')
    if (linkErr) {
      return NextResponse.json({ error: linkErr.message, imported }, { status: 400 })
    }

    const summary = (linkData && linkData[0]) || { linked: 0, created: 0, updated: 0 }
    return NextResponse.json({ success: true, imported, ...summary })
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao importar membros' }, { status: 500 })
  }
}


