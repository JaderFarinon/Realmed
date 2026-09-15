export type NotificationStatus = 'PENDENTE' | 'ENVIANDO' | 'ENVIADO' | 'FALHA'

export interface NotificationRecipient {
  id: number
  userId: number | null
  email: string | null
  status: 'PENDENTE' | 'ENVIADO' | 'FALHA'
  nome: string | null
  enviadoEm: string | null
  erroEnvio: string | null
}

export interface NotificationItem {
  id: number
  tipo: string
  status: NotificationStatus
  assunto: string
  mensagemHtml: string
  dados: unknown
  solicitacao: {
    id: number
    paciente: string | null
    numeroLiberacao: string | null
  } | null
  etapa: {
    id: number
    status: string | null
    nome: string | null
  } | null
  erroEnvio: string | null
  scheduledAt: string | null
  enviadoEm: string | null
  createdAt: string | null
  updatedAt: string | null
  destinatarios: NotificationRecipient[]
}

export interface NotificationQueueResponse {
  items: NotificationItem[]
  pagination: {
    page: number
    pageSize: number
    total: number
  }
}
