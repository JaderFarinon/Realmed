export const documentStatusLabels = {
  INCOMPLETE: 'Faltando documentação',
  COMPLETE: 'Documentação completa',
} as const

export const authorizationStatusLabels = {
  NOT_READY: 'Em preparação',
  READY: 'Pendente',
  IN_PROGRESS: 'Encaminhado ao convênio',
  PENDING: 'Pendência do convênio',
  AUTHORIZED: 'Liberado',
  DENIED: 'Negado',
  IN_APPEAL: 'Em recurso',
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

export const professionalTypeLabels = {
  PHYSIOTHERAPIST: 'Fisioterapeuta',
  DOCTOR: 'Médico',
} as const
export const procedureTypeLabels = {
  CONSULTATION: 'Consulta',
  PHYSIOTHERAPY: 'Fisioterapia',
  ELECTROSTIMULATION: 'Eletroestimulação',
  OTHER: 'Outro',
} as const
export const documentTypeLabels = {
  CONSULTATION_GUIDE: 'Guia de consulta',
  PHYSIOTHERAPY_GUIDE: 'Guia de fisioterapia',
  PHYSIO_ASSESSMENT: 'Avaliação fisioterapêutica recebida',
  PHYSIOTHERAPY_EVALUATION: 'Ficha de Avaliação Fisioterapêutica',
  ELECTROSTIMULATION: 'Eletroestimulação',
  INSURANCE_CARD: 'Carteirinha',
  OTHER: 'Outros',
} as const
export const pendingStatusLabels = { OPEN: 'Em aberto', RESOLVED: 'Resolvida' } as const

export const historyLabels: Record<string, string> = {
  GUIDE_AUTHORIZATION_UPDATED: 'Liberação da guia atualizada',
  GUIDE_BILLING_UPDATED: 'Faturamento da guia atualizado',
  PHYSIOTHERAPY_ROTATION_CONFIRMED: 'Rodízio de fisioterapia confirmado',
  STAGE_COMPLETED: 'Etapa finalizada',
  STAGE_REOPENED: 'Etapa reaberta para edição',
  PROCESS_CREATED: 'Tratamento criado',
  TREATMENT_CREATED: 'Tratamento criado',
  DOCUMENT_REQUIREMENTS_UPDATED: 'Obrigatoriedade dos documentos atualizada',
  AUTHORIZATION_DOCUMENT_ATTACHED: 'Documento da liberação anexado',
  GUIDE_CONTINUITY_ADDED: 'Guia de continuidade adicionada',
  GUIDE_CONTINUITY_CREATED: 'Continuidade criada sem nova avaliação',
  DOCUMENT_RECEIVED: 'Documento recebido',
  DOCUMENT_MARKED_USABLE: 'Documento marcado como adequado',
  DOCUMENT_MARKED_NEEDS_ADJUSTMENT: 'Documento marcado como necessitando ajuste',
  TREATMENT_READY_FOR_AUTHORIZATION: 'Tratamento encaminhado ao faturamento',
  DOCUMENT_UPLOADED: 'Documento anexado',
  DOCUMENT_REPLACED: 'Documento substituído',
  DOCUMENT_REMOVED: 'Documento removido',
  PATIENT_STENCI_REFRESHED: 'Dados do paciente atualizados do Stenci',
  DOCUMENT_GENERATED: 'Documento gerado',
  GUIDE_CODES_READ: 'Códigos da guia original lidos para conferência',
  DOCUMENT_PREVIEWED: 'Documento pré-visualizado',
  DOCUMENT_REGENERATED: 'Documento gerado novamente',
  STATUS_CHANGED: 'Status alterado',
  FIELD_CHANGED: 'Informação alterada',
  AUTHORIZATION_STARTED: 'Liberação iniciada',
  AUTHORIZATION_APPEALED: 'Recurso de autorização registrado',
  AUTHORIZATION_STATUS_CHANGED: 'Situação da liberação alterada',
  SENT_TO_INSURANCE: 'Encaminhado ao convênio',
  AUTHORIZATION_PENDING: 'Pendência do convênio registrada',
  AUTHORIZED: 'Tratamento liberado',
  DENIED: 'Tratamento não liberado',
  AUTHORIZATION_CREATED: 'Liberação registrada',
  AUTHORIZATION_UPDATED: 'Liberação atualizada',
  PENDING_ITEM_CREATED: 'Pendência do convênio registrada',
  PENDING_ITEM_RESOLVED: 'Liberação retomada após pendência',
}

export type LabelMap = Record<string, string>
export const labelFor = (map: LabelMap, value?: string | null) =>
  value ? map[value] || value : '—'

export function statusTone(value: string) {
  if (['COMPLETE', 'AUTHORIZED', 'NOT_REQUIRED', 'COMPLETED', 'BILLED'].includes(value))
    return 'success'
  if (['INCOMPLETE', 'PENDING', 'DENIED'].includes(value)) return 'danger'
  if (['READY', 'SESSION_TOKEN'].includes(value)) return 'warning'
  return 'info'
}

export const processStageLabels: Record<string, string> = {
  assessment: 'Aguardando Avaliação',
  preparation: 'Aguardando Central de Guias',
  ready: 'Pendente de Liberação',
  authorizing: 'Encaminhado ao Convênio',
  pending: 'Pendência do Convênio',
  denied: 'Não Liberado',
  appeals: 'Em Recurso',
  authorized: 'Liberado',
  treatment: 'Em Tratamento',
  billing: 'Faturar',
}
