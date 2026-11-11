export type TreatmentStatus =
  | 'MISSING_DOCUMENTS'
  | 'PENDING'
  | 'SENT'
  | 'DENIED'
  | 'AUTHORIZED'
  | 'IN_APPEAL'
  | 'PARTIAL'

export const treatmentStatusLabels: Record<TreatmentStatus, string> = {
  PARTIAL: 'Liberação Parcial',
  MISSING_DOCUMENTS: 'Faltando Documentação',
  PENDING: 'Pendente',
  SENT: 'Encaminhado ao Convênio',
  DENIED: 'Não Liberado',
  IN_APPEAL: 'Em Recurso',
  AUTHORIZED: 'Liberado',
}

export function treatmentStatus(process: {
  partial_authorization?: boolean | number
  continuation_of_id?: number | null
  document_status: string
  authorization_status: string
}): TreatmentStatus {
  if (process.partial_authorization) return 'PARTIAL'
  if (process.authorization_status === 'IN_APPEAL') return 'IN_APPEAL'
  if (process.continuation_of_id && process.authorization_status === 'READY') return 'PENDING'
  if (process.document_status === 'INCOMPLETE') return 'MISSING_DOCUMENTS'
  if (['AUTHORIZED', 'SESSION_TOKEN', 'NOT_REQUIRED'].includes(process.authorization_status))
    return 'AUTHORIZED'
  if (process.authorization_status === 'DENIED') return 'DENIED'
  if (['IN_PROGRESS', 'PENDING'].includes(process.authorization_status)) return 'SENT'
  return 'PENDING'
}

export const treatmentStatusLabel = (process: {
  partial_authorization?: boolean | number
  continuation_of_id?: number | null
  document_status: string
  authorization_status: string
}) => process.partial_authorization ? 'Liberação Parcial' : process.continuation_of_id && process.authorization_status === 'READY' ? 'Pendente de Liberação' : treatmentStatusLabels[treatmentStatus(process)]
