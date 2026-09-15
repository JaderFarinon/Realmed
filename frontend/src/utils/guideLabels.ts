export const documentStatusLabels = {
  INCOMPLETE: 'Documentação pendente',
  COMPLETE: 'Documentação completa',
} as const

export const authorizationStatusLabels = {
  NOT_READY: 'Em preparação',
  READY: 'Pendente de liberação',
  IN_PROGRESS: 'Em liberação',
  PENDING: 'Pendência do convênio',
  AUTHORIZED: 'Liberado',
  DENIED: 'Negado',
  SESSION_TOKEN: 'Liberação por sessão / token',
  NOT_REQUIRED: 'Não requer liberação',
} as const

export const treatmentStatusLabels = {
  WAITING: 'Aguardando início',
  IN_PROGRESS: 'Em tratamento',
  COMPLETED: 'Concluído',
} as const

export const billingStatusLabels = {
  NOT_READY: 'Não disponível para faturamento',
  READY: 'Pronto para faturamento',
  DELIVERED: 'Entregue ao faturamento',
  BILLED: 'Faturado',
} as const

export const authorizationTypeLabels = {
  PRE_AUTHORIZATION: 'Liberação prévia',
  SESSION_TOKEN: 'Token por sessão',
  NOT_REQUIRED: 'Não requer liberação',
} as const

export const professionalTypeLabels = { PHYSIOTHERAPIST: 'Fisioterapeuta', DOCTOR: 'Médico' } as const
export const procedureTypeLabels = { CONSULTATION: 'Consulta', PHYSIOTHERAPY: 'Fisioterapia', ELECTROSTIMULATION: 'Eletroestimulação', OTHER: 'Outro' } as const
export const documentTypeLabels = { CONSULTATION_GUIDE: 'Guia de consulta', PHYSIOTHERAPY_GUIDE: 'Guia de fisioterapia', PHYSIO_ASSESSMENT: 'Avaliação fisioterapêutica', ELECTROSTIMULATION: 'Eletroestimulação', INSURANCE_CARD: 'Carteirinha', OTHER: 'Outros' } as const
export const pendingStatusLabels = { OPEN: 'Em aberto', RESOLVED: 'Resolvida' } as const

export const historyLabels: Record<string, string> = {
  PROCESS_CREATED: 'Processo criado', DOCUMENT_UPLOADED: 'Documento anexado', DOCUMENT_REPLACED: 'Documento substituído', DOCUMENT_REMOVED: 'Documento removido', DOCUMENT_GENERATED: 'Documento gerado', DOCUMENT_PREVIEWED: 'Documento pré-visualizado', DOCUMENT_REGENERATED: 'Documento gerado novamente', STATUS_CHANGED: 'Status alterado', FIELD_CHANGED: 'Informação alterada', AUTHORIZATION_STARTED: 'Liberação iniciada', AUTHORIZATION_CREATED: 'Liberação registrada', AUTHORIZATION_UPDATED: 'Liberação atualizada', PENDING_ITEM_CREATED: 'Pendência do convênio registrada', PENDING_ITEM_RESOLVED: 'Liberação retomada após pendência',
}

export type LabelMap = Record<string, string>
export const labelFor = (map: LabelMap, value?: string | null) => value ? map[value] || value : '—'

export function statusTone(value: string) {
  if (['COMPLETE', 'AUTHORIZED', 'NOT_REQUIRED', 'COMPLETED', 'BILLED'].includes(value)) return 'success'
  if (['INCOMPLETE', 'PENDING', 'DENIED'].includes(value)) return 'danger'
  if (['READY', 'SESSION_TOKEN'].includes(value)) return 'warning'
  return 'info'
}
