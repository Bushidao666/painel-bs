"use client"

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, ArrowLeft } from 'lucide-react'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const supabase = createClient()
  const router = useRouter()
  const searchParams = useSearchParams()

  const [verifying, setVerifying] = useState(true)
  const [verified, setVerified] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const code = useMemo(() => searchParams.get('code') || searchParams.get('token') || '', [searchParams])
  const tokenHash = useMemo(() => searchParams.get('token_hash') || '', [searchParams])
  const type = useMemo(() => searchParams.get('type') || '', [searchParams])

  useEffect(() => {
    const run = async () => {
      setVerifying(true)
      setError(null)
      try {
        // 1) Se veio como PKCE (code), tenta exchangeCodeForSession
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (!error) {
            setVerified(true)
            return
          }
        }

        // 2) Se veio como token_hash (fallback OTP), tenta verifyOtp
        if (tokenHash) {
          const otpType = (type === 'invite' ? 'invite' : 'recovery') as 'invite' | 'recovery'
          const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type: otpType })
          if (!error) {
            setVerified(true)
            return
          }
        }

        setError('Link de recuperação inválido ou expirado.')
        setVerified(false)
      } catch (err) {
        setError('Não foi possível validar o link de recuperação.')
        setVerified(false)
      } finally {
        setVerifying(false)
      }
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, tokenHash, type])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.')
      return
    }
    if (password !== confirmPassword) {
      setError('As senhas não conferem.')
      return
    }

    setSubmitting(true)
    try {
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        setError(error.message)
        toast.error('Erro ao atualizar a senha')
        return
      }
      toast.success('Senha redefinida com sucesso! Faça login novamente.')
      await supabase.auth.signOut()
      router.push('/login')
    } catch (err) {
      setError('Erro inesperado ao atualizar a senha')
      toast.error('Erro inesperado')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl text-center">Redefinir senha</CardTitle>
        <CardDescription className="text-center">
          Defina sua nova senha para acessar o painel
        </CardDescription>
      </CardHeader>

      {verifying && (
        <CardContent className="space-y-4">
          <div className="flex items-center justify-center text-zinc-600">
            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Validando link de recuperação...
          </div>
        </CardContent>
      )}

      {!verifying && !verified && (
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          <CardFooter className="flex flex-col space-y-3">
            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-2 justify-center">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </CardFooter>
        </CardContent>
      )}

      {!verifying && verified && (
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="password">Nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-10"
                  required
                  minLength={8}
                  disabled={submitting}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col space-y-3">
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Salvando...
                </>
              ) : (
                'Salvar nova senha'
              )}
            </Button>

            <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-800 flex items-center gap-2 justify-center">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao login
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  )
}
