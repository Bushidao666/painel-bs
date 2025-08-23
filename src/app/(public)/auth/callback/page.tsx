'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function AuthCallbackPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const code = useMemo(() => searchParams.get('code') || searchParams.get('token') || '', [searchParams])
  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams])
  const type = useMemo(() => searchParams.get('type') || '', [searchParams])
  const redirectTo = useMemo(() => searchParams.get('redirect') || '/dashboard', [searchParams])

  const [processing, setProcessing] = useState(true)

  useEffect(() => {
    const run = async () => {
      try {
        // Prioriza PKCE (code)
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            router.replace(redirectTo)
            return
          }
        }

        // Fallback OTP (token_hash) para magic link / recovery / invite
        if (tokenHash) {
          const otpType = (type === 'recovery' || type === 'invite' || type === 'magiclink')
            ? (type as 'recovery' | 'invite' | 'magiclink')
            : 'magiclink'
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
          if (!error) {
            router.replace(redirectTo)
            return
          }
        }

        // Se vier especificamente do recovery, encaminha para reset-password
        if (type === 'recovery' || searchParams.get('from') === 'recovery') {
          const qs = searchParams.toString()
          router.replace(`/reset-password${qs ? `?${qs}` : ''}`)
          return
        }

        // Falhou: volta ao login
        router.replace('/login')
      } finally {
        setProcessing(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, tokenHash, type, redirectTo])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="flex items-center gap-3 text-zinc-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Processando autenticação...
      </div>
    </div>
  )
}


