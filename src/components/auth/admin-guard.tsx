'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2, ShieldOff } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface AdminGuardProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

export function AdminGuard({ children, fallback }: AdminGuardProps) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    checkAdminAccess()
  }, [])

  const checkAdminAccess = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        router.push('/login')
        return
      }

      // Verificar se o usuário é admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single()

      if (profile?.role === 'admin') {
        setIsAdmin(true)
      } else {
        setIsAdmin(false)
      }
    } catch (error) {
      console.error('Erro ao verificar acesso admin:', error)
      setIsAdmin(false)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!isAdmin) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-[400px] items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <ShieldOff className="h-8 w-8 text-red-600" />
              </div>
            </div>
            <CardTitle className="text-2xl">Acesso Restrito</CardTitle>
            <CardDescription className="text-red-600">
              Você não tem permissão para acessar esta área
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <p className="text-sm text-zinc-500 mb-4">
              Esta seção é restrita apenas para administradores do sistema.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Voltar ao Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}