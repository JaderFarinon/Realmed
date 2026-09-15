import api from '@/plugins/axios'

export interface PerfilGlobalUsuario {
  id: number
  nome?: string | null
  login?: string | null
  email?: string | null
}

export interface PerfisGlobaisResponse {
  cac: PerfilGlobalUsuario[]
  cacCoordenacao: PerfilGlobalUsuario[]
  secretarias: PerfilGlobalUsuario[]
}

export interface PerfisGlobaisMensagem {
  message?: string
}

export interface SalvarEquipeCacPayload {
  userIds: number[]
  coordenadoresIds: number[]
}

export interface SalvarSecretariasPayload {
  userIds: number[]
}

const normalizarLista = <T>(entrada: T | T[] | null | undefined): T[] => {
  if (!entrada) {
    return []
  }

  return Array.isArray(entrada) ? entrada : [entrada]
}

export const listarPerfisGlobais = async (): Promise<PerfisGlobaisResponse> => {
  const { data } = await api.get<Partial<PerfisGlobaisResponse>>('/esteira/perfis-globais')

  return {
    cac: normalizarLista(data?.cac),
    cacCoordenacao: normalizarLista(data?.cacCoordenacao),
    secretarias: normalizarLista(data?.secretarias),
  }
}

export const salvarPerfisGlobaisCAC = async (
  payload: SalvarEquipeCacPayload,
): Promise<PerfisGlobaisMensagem> => {
  const { data } = await api.post<PerfisGlobaisMensagem>('/esteira/perfis-globais/cac', payload)
  return data ?? {}
}

export const salvarPerfisGlobaisSecretarias = async (
  payload: SalvarSecretariasPayload,
): Promise<PerfisGlobaisMensagem> => {
  const { data } = await api.post<PerfisGlobaisMensagem>('/esteira/perfis-globais/secretarias', payload)
  return data ?? {}
}
