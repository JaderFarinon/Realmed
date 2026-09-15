export interface SurgicalRequestTimelineEvent {
  id: string
  type: string
  category: string
  title: string
  description: string | null
  timestamp: string | null
  actor: string | null
  status: string | null
  status_label: string | null
  details: string[]
  entity_id: number | string | null
  context: Record<string, unknown> | null
}

export interface SurgicalRequestTimelineSummary {
  id: number
  numero_liberacao: string | null
  nome_paciente: string | null
  status: string | null
  status_label: string | null
  data_solicitacao: string | null
  data_cirurgia: string | null
  created_at: string | null
  updated_at: string | null
  medico: string | null
  fornecedor: string | null
}

export interface SurgicalRequestTimelineResponse {
  solicitacao: SurgicalRequestTimelineSummary
  eventos: SurgicalRequestTimelineEvent[]
}

export interface SurgicalRequestChatAttachment {
  id: number
  nomeOriginal: string | null
  mimeType: string | null
  tamanhoBytes: number | null
  criadoEm: string | null
}

export interface SurgicalRequestChatMessage {
  id: number
  conteudo: string
  criadoEm: string | null
  autor: { id: number | null; nome: string | null } | null
  anexos: SurgicalRequestChatAttachment[]
}
