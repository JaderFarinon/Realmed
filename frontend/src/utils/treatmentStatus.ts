export type TreatmentStatus = 'MISSING_DOCUMENTS' | 'PENDING' | 'SENT' | 'DENIED' | 'AUTHORIZED'

export const treatmentStatusLabels: Record<TreatmentStatus, string> = {
  MISSING_DOCUMENTS: 'Faltando Documentação',
  PENDING: 'Pendente',
  SENT: 'Encaminhado ao Convênio',
  DENIED: 'Não Liberado',
  AUTHORIZED: 'Liberado',
}

export function treatmentStatus(process: { document_status: string; authorization_status: string }): TreatmentStatus {
  if (process.document_status === 'INCOMPLETE') return 'MISSING_DOCUMENTS'
  if (['AUTHORIZED', 'SESSION_TOKEN', 'NOT_REQUIRED'].includes(process.authorization_status)) return 'AUTHORIZED'
  if (process.authorization_status === 'DENIED') return 'DENIED'
  if (['IN_PROGRESS', 'PENDING'].includes(process.authorization_status)) return 'SENT'
  return 'PENDING'
}

export const treatmentStatusLabel = (process: { document_status: string; authorization_status: string }) =>
  treatmentStatusLabels[treatmentStatus(process)]
