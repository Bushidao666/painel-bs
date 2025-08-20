import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { role } = await request.json()
    
    // Validar role
    if (!['admin', 'user', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Role inválido' }, { status: 400 })
    }
    
    // Verificar se o usuário atual é admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar role do usuário atual
    const { data: currentUserProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (currentUserProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Não permitir que o admin remova seu próprio status de admin
    if (params.id === user.id && role !== 'admin') {
      return NextResponse.json(
        { error: 'Você não pode remover seu próprio status de admin' },
        { status: 400 }
      )
    }

    // Atualizar role do usuário
    const { error } = await supabase
      .from('user_profiles')
      .update({ role, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar role:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar role' },
      { status: 500 }
    )
  }
}