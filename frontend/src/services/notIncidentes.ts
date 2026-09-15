import api from '@/plugins/axios'
import type {
  Diagramas,
  NotificacaoFiltro,
  NotificacaoIncidente,
  NotificacaoTipo,
  PermissaoNotificacao,
  PosProcessamento,
  PreProcessamento,
  RespNotificacao,
} from '@/types/notIncidentes'

export interface NotificacaoListResponse {
  data: NotificacaoIncidente[]
  meta: {
    total: number
  }
}

export interface CreateNotificacaoPayload {
  nmCriador?: string | null
  dsSetor: string
  dsFato: string
  dsConseq: string
  dsAcao: string
  dsConseqDet: string
  dtIncidente: string
  dsMaquina?: string | null
  nmMedico?: string | null
  nmPaciente?: string | null
  dsIncidente: string
  dsSubtipoIncidente?: string | null
  nrAtendimento?: string | null
  dtAtendimento?: string | null
  dsMedicoResponsavel?: string | null
  dsProtocolo?: string | null
  dsCateter?: string | null
  cdPaciente?: string | null
  escalaNews?: string | null
  cdEscalaNews?: number | null
  dsEmail?: string | null
}

export interface UpdateNotificacaoPayload extends Partial<CreateNotificacaoPayload> {
  status?: string
}

export const fetchNotificacoes = async (
  params: NotificacaoFiltro & {
    qualidade?: boolean
    pesquisa?: boolean
    responsavelId?: number | null
    page?: number
    perPage?: number
    scope?: string
  },
): Promise<NotificacaoListResponse> => {
  const { data } = await api.get('/not-incidentes', { params })
  return data
}

export const fetchNotificacaoById = async (id: number): Promise<NotificacaoIncidente> => {
  const { data } = await api.get(`/not-incidentes/${id}`)
  return data
}

export const createNotificacao = async (payload: CreateNotificacaoPayload): Promise<NotificacaoIncidente> => {
  const { data } = await api.post('/not-incidentes', payload)
  return data
}

export const updateNotificacao = async (
  id: number,
  payload: UpdateNotificacaoPayload,
): Promise<NotificacaoIncidente> => {
  const { data } = await api.put(`/not-incidentes/${id}`, payload)
  return data
}

export const savePreProcessamento = async (
  id: number,
  payload: PreProcessamento,
): Promise<{ message: string; preProcessamento: PreProcessamento }> => {
  const { data } = await api.put(`/not-incidentes/${id}/pre-processamento`, payload)
  return data
}

export const cancelPreProcessamento = async (
  id: number,
): Promise<{ message: string }> => {
  const { data } = await api.post(`/not-incidentes/${id}/pre-processamento/cancelar`)
  return data
}

export const savePosProcessamento = async (
  id: number,
  payload: PosProcessamento,
): Promise<{ message: string; posProcessamento: PosProcessamento }> => {
  const { data } = await api.put(`/not-incidentes/${id}/pos-processamento`, payload)
  return data
}

export const saveDiagramas = async (
  id: number,
  payload: Diagramas,
): Promise<{ message: string; diagramas: Diagramas }> => {
  const { data } = await api.put(`/not-incidentes/${id}/diagramas`, payload)
  return data
}

export const fetchResponsaveis = async (): Promise<RespNotificacao[]> => {
  const { data } = await api.get('/not-incidentes/responsaveis')
  return data
}

export const createResponsavel = async (
  dsResp: string,
): Promise<{ message: string; responsavel: RespNotificacao }> => {
  const { data } = await api.post('/not-incidentes/responsaveis', { dsResp })
  return data
}

export const fetchTiposNotificacao = async (
  params?: { qualidade?: boolean; pesquisa?: boolean; incluirSubtipos?: boolean },
): Promise<NotificacaoTipo[]> => {
  const { data } = await api.get('/not-incidentes/tipos', { params })
  return data
}

export const fetchPermissoes = async (): Promise<PermissaoNotificacao[]> => {
  const { data } = await api.get('/not-incidentes/permissoes')
  return data
}

export const fetchPermissaoByUsuario = async (
  usuarioId: number,
): Promise<PermissaoNotificacao> => {
  const { data } = await api.get(`/not-incidentes/permissoes/${usuarioId}`)
  return data
}

export const savePermissao = async (
  usuarioId: number,
  payload: Partial<PermissaoNotificacao>,
): Promise<{ message: string; permissao: PermissaoNotificacao }> => {
  const { data } = await api.put(`/not-incidentes/permissoes/${usuarioId}`, payload)
  return data
}
