import api from '@/plugins/axios'
import { notify } from '@/composables/useNotifications'

export async function patientPortalUrl(processId: string | number) {
  const { data } = await api.post(`/patient-portal/treatments/${encodeURIComponent(String(processId))}/access`)
  if (!/^\/paciente\/[A-Za-z0-9_-]{43}$/.test(data.path)) throw new Error('Link do paciente inválido.')
  return new URL(data.path, window.location.origin).href
}
export async function openPatientPortal(processId: string | number) {
  // Open synchronously for popup blockers; remove the opener before navigating to the public app.
  const tab = window.open('about:blank', '_blank')
  if (tab) tab.opener = null
  try {
    const url = await patientPortalUrl(processId)
    if (tab && !tab.closed) tab.location.replace(url)
    else notify('O navegador bloqueou a nova aba. Abra o QR code na avaliação para acessar o link.', 'warning')
  } catch (error: any) {
    tab?.close()
    notify(error.response?.data?.error || 'Não foi possível abrir o app do paciente.', 'error')
  }
}
