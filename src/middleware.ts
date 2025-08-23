import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  // Primeiro atualizar a sessão
  const response = await updateSession(request)
  
  // Paths públicos que não precisam de autenticação
  const publicExact = ['/login', '/signup', '/forgot-password', '/reset-password', '/']
  const publicPrefixes = ['/invite', '/_next', '/api/auth', '/auth/callback']
  const pathname = request.nextUrl.pathname
  const isPublicPath = publicExact.includes(pathname) || publicPrefixes.some((p) => pathname.startsWith(p))

  // Se for path público, permitir acesso
  if (isPublicPath) {
    return response
  }

  // Para paths protegidos, verificar autenticação e role-based access
  const hasSupabaseEnv = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  const supabase = createServerClient(
    hasSupabaseEnv ? process.env.NEXT_PUBLIC_SUPABASE_URL! : '',
    hasSupabaseEnv ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! : '',
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll() {}
      }
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    const loginUrl = new URL('/login', request.url)
    // preservar rota e query
    const redirectPath = request.nextUrl.pathname + (request.nextUrl.search || '')
    loginUrl.searchParams.set('redirect', redirectPath)
    return NextResponse.redirect(loginUrl)
  }

  // Obter role do usuário
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'user'

  // Regra: role 'support' só pode acessar /support (e suas subrotas) e APIs relacionadas
  const isSupportOnlyArea = request.nextUrl.pathname.startsWith('/support') || request.nextUrl.pathname.startsWith('/api/support')
  if (role === 'support' && !isSupportOnlyArea) {
    const supportUrl = new URL('/support', request.url)
    return NextResponse.redirect(supportUrl)
  }

  return response
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
