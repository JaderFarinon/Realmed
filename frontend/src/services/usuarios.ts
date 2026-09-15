import api from '@/plugins/axios'

export type UsuarioRole =
  | 'masteradmin'
  | 'admin'
  | 'cac_coord'
  | 'cac'
  | 'secretaria'
  | 'user'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'patient'

export type UsuarioStatus = 'active' | 'inactive' | 'blocked'

export interface Usuario {
  id: number
  personId: number | null
  nome: string
  email: string
  telefone: string | null
  documento: string
  login: string
  role: UsuarioRole
  status: UsuarioStatus
  createdAt: string
  updatedAt: string | null
  unidades: Array<{ id: number; nome: string }>
  unidadeIds: number[]
}

export interface UsuarioPayload {
  personId?: number | null
  nome: string
  email: string
  telefone?: string | null
  documento: string
  login: string
  senha?: string
  role?: UsuarioRole
  status?: UsuarioStatus
  unidadeIds?: number[]
}

export interface UsuarioFiltro {
  search?: string
  role?: UsuarioRole
  status?: UsuarioStatus
}

export const listarUsuarios = async (filtros: UsuarioFiltro = {}): Promise<Usuario[]> => {
  const { data } = await api.get<Usuario[]>('/usuarios', { params: filtros })
  return data
}

export const criarUsuario = async (payload: UsuarioPayload): Promise<Usuario> => {
  const { data } = await api.post<Usuario>('/usuarios', payload)
  return data
}

export const atualizarUsuario = async (id: number, payload: UsuarioPayload): Promise<Usuario> => {
  const { data } = await api.put<Usuario>(`/usuarios/${id}`, payload)
  return data
}

export const removerUsuario = async (id: number): Promise<void> => {
  await api.delete(`/usuarios/${id}`)
}
