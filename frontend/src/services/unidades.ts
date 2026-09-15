import api from '@/plugins/axios'

export interface Unidade {
  id: number
  nome: string
  createdAt: string
  updatedAt: string | null
}

export interface UnidadePayload {
  nome: string
}

export const listarUnidades = async (): Promise<Unidade[]> => {
  const { data } = await api.get<Unidade[]>('/unidades')
  return data
}

export const criarUnidade = async (payload: UnidadePayload): Promise<Unidade> => {
  const { data } = await api.post<Unidade>('/unidades', payload)
  return data
}

export const atualizarUnidade = async (id: number, payload: UnidadePayload): Promise<Unidade> => {
  const { data } = await api.put<Unidade>(`/unidades/${id}`, payload)
  return data
}

export const removerUnidade = async (id: number): Promise<void> => {
  await api.delete(`/unidades/${id}`)
}
