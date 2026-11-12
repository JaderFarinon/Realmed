export interface PhysioAppointment {
  id: string; patient_id: string; patient_name: string; patient_birth_date?: string | null;
  insurance_name?: string | null; startDate: string; endDate?: string | null; status: string;
  schedule_id: string; schedule_name: string;
  expenses?: Array<{ name?: string | null; code?: string | null; type?: string | null; quantity?: number | null }>
}
export interface PhysioSession {
  id: string; number: number; start_time: string; end_time: string; end_next_day?: boolean;
  end_estimated?: boolean; end_source?: string; schedule_id: string; schedule_name: string; items: PhysioAppointment[];
  start_minute?: number; end_minute?: number;
}
export type PhysioSessionAccess = 'current' | 'past' | 'future' | 'unavailable'
const sessionClock = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'})
export function sessionAccess(session: Pick<PhysioSession,'start_minute'|'end_minute'> | null | undefined, date: string, now: number | null): PhysioSessionAccess {
  const start = session?.start_minute, end = session?.end_minute
  if(now === null || !Number.isFinite(now) || !Number.isInteger(start) || !Number.isInteger(end) || start! < 0 || start! >= 1440 || end! <= start! || end! > start! + 1440) return 'unavailable'
  const day = Date.parse(`${date}T00:00:00.000Z`)
  if(!Number.isFinite(day) || new Date(day).toISOString().slice(0,10) !== date) return 'unavailable'
  const parts = Object.fromEntries(sessionClock.formatToParts(new Date(now)).map(part=>[part.type,part.value]))
  const minute = (Date.parse(`${parts.year}-${parts.month}-${parts.day}T00:00:00.000Z`) - day) / 60000 + Number(parts.hour)*60 + Number(parts.minute)
  return minute < start! ? 'future' : minute >= end! ? 'past' : 'current'
}
export const sessionAccessLabel: Record<PhysioSessionAccess,string> = {current:'Horário atual',past:'Horário encerrado',future:'Aguardando horário',unavailable:'Abertura indisponível'}
export interface PhysioVisit { id: string; date: string; startAt: string; schedule: string; status: string }
export const appointmentStatuses: Record<string, { label: string; color: string }> = {
  scheduled: { label: 'Agendado', color: '#f1e87a' },
  patient_canceled: { label: 'Cancelado pelo paciente', color: '#ff9696' },
  professional_canceled: { label: 'Cancelado pelo profissional', color: '#ff9696' },
  confirmed: { label: 'Confirmado', color: '#00b6ae' },
  unsuccessful: { label: 'Contato sem sucesso', color: '#8b68ce' },
  in_attendance: { label: 'Em Atendimento', color: '#20f8ff' },
  waiting: { label: 'Em Espera', color: '#e8a363' },
  missed: { label: 'Falta', color: '#f85c5c' },
  finished: { label: 'Finalizado', color: '#3197ff' },
  report: { label: 'Laudo', color: '#30ff9b' },
  payment: { label: 'Pagamento', color: '#b74aff' },
  pending: { label: 'Pendência', color: '#787878' },
  rescheduled: { label: 'Remarcado', color: '#e895ff' },
  screening: { label: 'Triagem', color: '#b4ff00' },
}
export function appointmentStatus(status: string) {
  return appointmentStatuses[status] || { label: status ? 'Status não identificado' : 'Status não informado', color: '#64748b' }
}
export function physioTime(value: string) {
  if (!value) return '—'
  if (!/[zZ]$|[+-]\d{2}:?\d{2}$/.test(value)) return value.slice(11, 16) || '—'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '—' : new Intl.DateTimeFormat('pt-BR', {timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}).format(date)
}
export const physioDate = (value: string) => String(value || '').slice(0,10).split('-').reverse().join('/')
