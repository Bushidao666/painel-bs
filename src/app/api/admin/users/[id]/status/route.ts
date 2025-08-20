import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient()
    const { is_active } = await request.json()
    
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

    // Não permitir que o admin desative sua própria conta
    if (params.id === user.id && !is_active) {
      return NextResponse.json(
        { error: 'Você não pode desativar sua própria conta' },
        { status: 400 }
      )
    }

    // Atualizar status do usuário
    const { error } = await supabase
      .from('user_profiles')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', params.id)

    if (error) {
      throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Erro ao atualizar status:', error)
    return NextResponse.json(
      { error: 'Erro ao atualizar status' },
      { status: 500 }
    )
  }
}