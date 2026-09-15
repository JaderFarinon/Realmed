import api from '@/plugins/axios'
export type UsuarioRole =
  | 'masteradmin'
  | 'admin'
  | 'user'
  | 'doctor'
  | 'nurse'
  | 'pharmacist'
  | 'patient'
export type UsuarioStatus = 'active' | 'inactive' | 'blocked'
export interface Usuario {
  id: number
  personId: number
  nome: string
  email: string
  telefone: string | null
  documento: string
  login: string
  role: UsuarioRole
  status: UsuarioStatus
  createdAt: string
  updatedAt: string | null
}
export interface UsuarioPayload {
  nome: string
  email: string
  telefone?: string
  documento: string
  login: string
  senha?: string
  role: UsuarioRole
  status: UsuarioStatus
}
export const listarUsuarios = async () => (await api.get<Usuario[]>('/usuarios')).data
export const criarUsuario = async (payload: UsuarioPayload) =>
  (await api.post<Usuario>('/usuarios', payload)).data
export const atualizarUsuario = async (id: number, payload: UsuarioPayload) =>
  (await api.put<Usuario>(`/usuarios/${id}`, payload)).data
export const removerUsuario = async (id: number) => {
  await api.delete(`/usuarios/${id}`)
}
