import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { email, role, department, message } = await request.json()
    
    // Validar dados
    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório' }, { status: 400 })
    }
    
    if (!['admin', 'user', 'viewer', 'support'].includes(role)) {
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

    // Verificar se o email já está cadastrado
    const { data: existingUser } = await supabase
      .rpc('get_auth_users_data', { user_ids: [] })
      .eq('email', email)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'Este email já está cadastrado no sistema' },
        { status: 400 }
      )
    }

    // Verificar se já existe convite pendente para este email
    const { data: existingInvite } = await supabase
      .from('user_invites')
      .select('id')
      .eq('email', email)
      .is('accepted_at', null)
      .gte('expires_at', new Date().toISOString())
      .single()

    if (existingInvite) {
      return NextResponse.json(
        { error: 'Já existe um convite pendente para este email' },
        { status: 400 }
      )
    }

    // Enviar convite via Supabase Auth Admin API
    const baseUrl = request.headers.get('origin') || process.env.NEXT_PUBLIC_APP_URL || ''
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    let inviteUrl: string | null = null
    let sent = false

    if (serviceKey) {
      const adminClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        serviceKey
      )

      const { data: inviteRes, error: inviteErr } = await adminClient.auth.admin.inviteUserByEmail(
        email,
        {
          redirectTo: `${baseUrl}/login`,
          data: { role, department, invited_by: user.id }
        }
      )

      if (!inviteErr) {
        sent = true
      }
    }

    // Fallback: convite manual com token + link para aceitar
    if (!sent) {
      const { data: inviteRow, error: inviteDbErr } = await supabase
        .from('user_invites')
        .insert({ email, role, invited_by: user.id })
        .select('invite_token')
        .single()

      if (inviteDbErr) {
        return NextResponse.json({ error: inviteDbErr.message }, { status: 400 })
      }
      inviteUrl = `${baseUrl}/invite/${inviteRow!.invite_token}`
    }

    return NextResponse.json({ success: true, sent, inviteUrl })
  } catch (error) {
    console.error('Erro ao criar convite:', error)
    return NextResponse.json(
      { error: 'Erro ao criar convite' },
      { status: 500 }
    )
  }
}

// Listar convites
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    
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

    // Buscar convites com informações do convidador
    const { data: invites, error } = await supabase
      .from('user_invites')
      .select(`
        id,
        email,
        role,
        invite_token,
        expires_at,
        accepted_at,
        created_at,
        invited_by,
        inviter:user_profiles!invited_by(full_name)
      `)
      .order('created_at', { ascending: false })

    if (error) {
      throw error
    }

    return NextResponse.json(invites || [])
  } catch (error) {
    console.error('Erro ao buscar convites:', error)
    return NextResponse.json(
      { error: 'Erro ao buscar convites' },
      { status: 500 }
    )
  }
}