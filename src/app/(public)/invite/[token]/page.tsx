'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Lock, User, Mail, Rocket, CheckCircle, XCircle } from 'lucide-react'
import { toast } from 'sonner'

interface InviteDetails {
  email: string
  role: string
  expires_at: string
}

export default function AcceptInvitePage() {
  const router = useRouter()
  const params = useParams<{ token: string }>()
  const supabase = createClient()
  const [inviteDetails, setInviteDetails] = useState<InviteDetails | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isValid, setIsValid] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    password: '',
    confirmPassword: ''
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    checkInvite()
  }, [params.token])

  const checkInvite = async () => {
    try {
      // Verificar se o token é válido
      const { data: invite, error } = await supabase
        .from('user_invites')
        .select('email, role, expires_at, accepted_at')
        .eq('invite_token', params.token)
        .single()

      if (error || !invite) {
        setError('Convite inválido ou não encontrado')
        setIsValid(false)
        return
      }

      // Verificar se já foi aceito
      if (invite.accepted_at) {
        setError('Este convite já foi utilizado')
        setIsValid(false)
        return
      }

      // Verificar se expirou
      if (new Date(invite.expires_at) < new Date()) {
        setError('Este convite expirou')
        setIsValid(false)
        return
      }

      setInviteDetails(invite)
      setIsValid(true)
    } catch (error) {
      setError('Erro ao verificar convite')
      setIsValid(false)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.password !== formData.confirmPassword) {
      setError('As senhas não coincidem')
      return
    }

    if (formData.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres')
      return
    }

    setIsSubmitting(true)

    try {
      // Criar conta com o email do convite
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: inviteDetails!.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.name,
            role: inviteDetails!.role
          }
        }
      })

      if (signUpError) {
        setError(signUpError.message)
        return
      }

      if (data.user) {
        // Marcar convite como aceito
        await supabase
          .from('user_invites')
          .update({ accepted_at: new Date().toISOString() })
          .eq('invite_token', params.token)

        toast.success('Conta criada com sucesso!')
        
        // Se a confirmação de email estiver desabilitada, fazer login automático
        if (data.session) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      }
    } catch (error) {
      setError('Erro ao criar conta')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.id]: e.target.value
    }))
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
      </div>
    )
  }

  if (!isValid) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 bg-red-100 rounded-full">
              <XCircle className="h-8 w-8 text-red-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Convite Inválido</CardTitle>
          <CardDescription className="text-red-600">
            {error}
          </CardDescription>
        </CardHeader>
        <CardFooter className="justify-center">
          <Button onClick={() => router.push('/login')}>
            Ir para Login
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-center mb-4">
          <div className="flex items-center gap-2">
            <Rocket className="h-8 w-8 text-purple-600" />
            <span className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
              BS Launch Center
            </span>
          </div>
        </div>
        <CardTitle className="text-2xl text-center">Aceitar Convite</CardTitle>
        <CardDescription className="text-center">
          Você foi convidado para se juntar ao sistema como <strong>{inviteDetails?.role}</strong>
        </CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <Mail className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              Sua conta será criada com o email: <strong>{inviteDetails?.email}</strong>
            </AlertDescription>
          </Alert>
          
          <div className="space-y-2">
            <Label htmlFor="name">Nome Completo</Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                id="name"
                type="text"
                placeholder="Seu nome"
                value={formData.name}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                id="password"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={formData.password}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-zinc-400" />
              <Input
                id="confirmPassword"
                type="password"
                placeholder="Digite a senha novamente"
                value={formData.confirmPassword}
                onChange={handleChange}
                className="pl-10"
                required
                disabled={isSubmitting}
              />
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex flex-col space-y-3">
          <Button 
            type="submit" 
            className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Criando conta...
              </>
            ) : (
              <>
                <CheckCircle className="mr-2 h-4 w-4" />
                Aceitar Convite e Criar Conta
              </>
            )}
          </Button>
          
          <p className="text-sm text-center text-zinc-500">
            Já tem uma conta?{' '}
            <a href="/login" className="text-purple-600 hover:text-purple-500">
              Fazer login
            </a>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}