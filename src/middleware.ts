import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  // Primeiro atualizar a sessão
  const response = await updateSession(request)
  
  // Paths públicos que não precisam de autenticação
  const publicPaths = ['/login', '/signup', '/forgot-password', '/']
  const isPublicPath = publicPaths.some(path => 
    request.nextUrl.pathname === path || 
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.startsWith('/api/auth')
  )

  // Se for path público, permitir acesso
  if (isPublicPath) {
    return response
  }

  // Para paths protegidos, verificar autenticação
  // A verificação real é feita pelo updateSession
  // que já atualiza os cookies de autenticação
  
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
