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
export type AuthProvider = 'STENCI' | 'LOCAL'
export interface Usuario {
  id: number
  personId: number
  nome: string
  email: string | null
  telefone: string | null
  documento: string | null
  login: string
  role: UsuarioRole
  status: UsuarioStatus
  stenciLinked: boolean
  authProvider: AuthProvider
  lastLogin: string | null
  createdAt: string
  updatedAt: string | null
  professionalId: number | null
  professionalName: string | null
  faceEnrolled: boolean
}
export interface UsuarioPayload {
  nome: string
  email: string | null
  telefone?: string
  documento: string | null
  login: string
  role: UsuarioRole
  status: UsuarioStatus
  authProvider: AuthProvider
  senha?: string
  confirmarSenha?: string
}
export const listarUsuarios = async () => (await api.get<Usuario[]>('/usuarios')).data
export const criarUsuario = async (payload: UsuarioPayload) =>
  (await api.post<Usuario>('/usuarios', payload)).data
export const atualizarUsuario = async (id: number, payload: UsuarioPayload) =>
  (await api.put<Usuario>(`/usuarios/${id}`, payload)).data
export const removerUsuario = async (id: number) => {
  await api.delete(`/usuarios/${id}`)
}
export interface FisioterapeutaOption {
  id: number
  full_name: string
  council_number: string
  state: string
}
export const listarFisioterapeutas = async () =>
  (await api.get<FisioterapeutaOption[]>('/usuarios/physiotherapist-options')).data
export const associarFisioterapeuta = async (userId: number, professionalId: number | null) =>
  (await api.put<Usuario>(`/usuarios/${userId}/physiotherapist`, { professionalId })).data
export const cadastrarFace = async (userId: number, images: string[]) =>
  (await api.post<{ faceEnrolled: boolean }>(`/usuarios/${userId}/face`, { images })).data
export const removerFace = async (userId: number) => {
  await api.delete(`/usuarios/${userId}/face`)
}
