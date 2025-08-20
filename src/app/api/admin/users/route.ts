import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // Verificar se o usuário atual é admin
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Verificar role do usuário
    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (userProfile?.role !== 'admin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 })
    }

    // Buscar todos os usuários com seus perfis
    const { data: users, error } = await supabase
      .from('user_profiles')
      .select(`
        id,
        full_name,
        role,
        department,
        is_active,
        created_at,
        invited_by
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    // Buscar dados de auth.users para email e último login
    const userIds = users?.map(u => u.id) || []
    
    const { data: authUsers } = await supabase
      .rpc('get_auth_users_data', { user_ids: userIds })

    // Combinar dados
    const combinedUsers = users?.map(profile => {
      const authUser = authUsers?.find((au: any) => au.id === profile.id)
      return {
        ...profile,
        email: authUser?.email || '',
        last_sign_in_at: authUser?.last_sign_in_at || null
      }
    }) || []

    return NextResponse.json(combinedUsers)
  } catch (error) {
    console.error('Erro ao buscar usuários:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar usuários' },
      { status: 500 }
    )
  }
}

// Criar função RPC para buscar dados de auth.users
// Esta função precisa ser criada no Supabase
const createGetAuthUsersFunction = `
CREATE OR REPLACE FUNCTION get_auth_users_data(user_ids UUID[])
RETURNS TABLE (
  id UUID,
  email TEXT,
  last_sign_in_at TIMESTAMPTZ
) 
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id,
    u.email::TEXT,
    u.last_sign_in_at
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql;
`