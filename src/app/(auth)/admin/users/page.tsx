'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  UserPlus, 
  Search, 
  MoreVertical, 
  Shield, 
  User, 
  Eye,
  Mail,
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { InviteUserModal } from '@/components/admin/invite-user-modal'
import { AdminGuard } from '@/components/auth/admin-guard'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface UserProfile {
  id: string
  email: string
  full_name: string
  role: 'admin' | 'user' | 'viewer'
  department: string | null
  is_active: boolean
  created_at: string
  last_sign_in_at: string | null
  invited_by_name?: string
}

export default function UsersManagementPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    fetchUsers()
  }, [])

  const fetchUsers = async () => {
    try {
      const response = await fetch('/api/admin/users')
      if (!response.ok) throw new Error('Erro ao buscar usuários')
      const data = await response.json()
      setUsers(data)
    } catch (error) {
      toast.error('Erro ao carregar usuários')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole })
      })

      if (!response.ok) throw new Error('Erro ao atualizar role')
      
      toast.success('Role atualizado com sucesso')
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao atualizar role')
    }
  }

  const handleToggleStatus = async (userId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !isActive })
      })

      if (!response.ok) throw new Error('Erro ao atualizar status')
      
      toast.success(`Usuário ${!isActive ? 'ativado' : 'desativado'} com sucesso`)
      fetchUsers()
    } catch (error) {
      toast.error('Erro ao atualizar status')
    }
  }

  const filteredUsers = users.filter(user => 
    user.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.department?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getRoleBadge = (role: string) => {
    const variants = {
      admin: { color: 'bg-purple-100 text-purple-800', icon: Shield },
      user: { color: 'bg-blue-100 text-blue-800', icon: User },
      viewer: { color: 'bg-gray-100 text-gray-800', icon: Eye }
    }
    
    const variant = variants[role as keyof typeof variants] || variants.user
    const Icon = variant.icon
    
    return (
      <Badge className={`${variant.color} gap-1`}>
        <Icon className="h-3 w-3" />
        {role}
      </Badge>
    )
  }

  return (
    <AdminGuard>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Gerenciar Usuários</h1>
            <p className="text-zinc-500">
              Gerencie usuários, convites e permissões do sistema
            </p>
          </div>
          <Button onClick={() => setIsInviteModalOpen(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Convidar Usuário
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total de Usuários</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{users.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Usuários Ativos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {users.filter(u => u.is_active).length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Administradores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {users.filter(u => u.role === 'admin').length}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Visualizadores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">
                {users.filter(u => u.role === 'viewer').length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Usuários</CardTitle>
            <div className="flex items-center gap-4 mt-4">
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <Input
                  placeholder="Buscar por nome, email ou departamento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Último Acesso</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Carregando usuários...
                    </TableCell>
                  </TableRow>
                ) : filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-zinc-500">
                      Nenhum usuário encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium">{user.full_name || 'Sem nome'}</span>
                          <span className="text-sm text-zinc-500">{user.email}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell>{user.department || '-'}</TableCell>
                      <TableCell>
                        {user.is_active ? (
                          <Badge className="bg-green-100 text-green-800 gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Ativo
                          </Badge>
                        ) : (
                          <Badge className="bg-red-100 text-red-800 gap-1">
                            <XCircle className="h-3 w-3" />
                            Inativo
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {user.last_sign_in_at 
                          ? format(new Date(user.last_sign_in_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                          : 'Nunca'
                        }
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'admin')}
                              disabled={user.role === 'admin'}
                            >
                              Tornar Admin
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'user')}
                              disabled={user.role === 'user'}
                            >
                              Tornar Usuário
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleRoleChange(user.id, 'viewer')}
                              disabled={user.role === 'viewer'}
                            >
                              Tornar Visualizador
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleToggleStatus(user.id, user.is_active)}
                              className={user.is_active ? 'text-red-600' : 'text-green-600'}
                            >
                              {user.is_active ? 'Desativar' : 'Ativar'} Usuário
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <InviteUserModal 
          isOpen={isInviteModalOpen}
          onClose={() => setIsInviteModalOpen(false)}
          onSuccess={() => {
            setIsInviteModalOpen(false)
            toast.success('Convite enviado com sucesso!')
          }}
        />
      </div>
    </AdminGuard>
  )
}