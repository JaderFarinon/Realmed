import axios from 'axios'
import { deferApiRequests, deferFacialLogin } from '@/utils/apiCooldown'
import { requestStenciRefresh, type StenciOperation } from '@/composables/useStenciRefresh'

const configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005'
const origin = configuredUrl.replace(/\/+$/, '')
export const editorId = crypto.randomUUID()
const api = axios.create({
  baseURL: /\/api$/i.test(origin) ? origin : `${origin}/api`,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  if (String(config.url).startsWith('/physio/')) config.timeout = 90000
  if (String(config.url).startsWith('/billing/stenci')) config.timeout = 90000
  if (
    /^\/integrations\/stenci\/(patients\/search|insurances|insurance-plans|professionals|test-connection)(?:\?|$)/.test(
      String(config.url),
    )
  )
    config.timeout = 90000
  if (/^\/integrations\/stenci\/treatments\/\d+\/refresh-patient$/.test(String(config.url)))
    config.timeout = 180000
  if (/\/rotation(?:\/|$)|^\/physiotherapy-rotation/.test(String(config.url)))
    config.timeout = 180000
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  config.headers['X-Realmed-Editor'] = editorId
  return config
})
api.interceptors.response.use(undefined, async (error) => {
  const requestPath = String(error.config?.url || '').split('?')[0]
  const publicPhysioFaceRequest =
    requestPath === '/physio/auth/challenge' || requestPath === '/physio/auth/face'
  if (error.response?.status === 429) {
    const defer = publicPhysioFaceRequest ? deferFacialLogin : deferApiRequests
    defer(error.response.headers?.['retry-after'])
  }
  if (requestPath.startsWith('/physio/') && requestPath !== '/physio/session' && error.response?.data?.code === 'PHYSIO_SESSION_REQUIRED' && !error.config?._physioRetried) {
    await ensurePhysioSession()
    return api.request({...error.config,_physioRetried:true})
  }
  if (
    error.response?.status === 428 &&
    error.response?.data?.code === 'STENCI_REFRESH_REQUIRED' &&
    !error.config?._stenciRetried
  ) {
    const path = String(error.config.url || '').split('?')[0]
    if (
      /^\/integrations\/stenci\/treatments\/\d+\/refresh-patient$/.test(path) &&
      error.response.data.stenciOperation?.name === 'searchPatients'
    ) {
      await requestStenciRefresh(error.response.data.stenciOperation)
      return api.request({ ...error.config, _stenciRetried: true })
    }
    if (
      /\/rotation(?:\/|$)|^\/physiotherapy-rotation/.test(path) &&
      error.response.data.stenciOperation?.name === 'rotationRead'
    ) {
      await requestStenciRefresh(error.response.data.stenciOperation)
      return api.request({ ...error.config, _stenciRetried: true })
    }
    if (path === '/billing/stenci') {
      await requestStenciRefresh({ name: 'billingRead', ...error.config.params })
      return api.request({ ...error.config, _stenciRetried: true })
    }
    const names: Record<string, string> = {
      '/integrations/stenci/insurances': 'listInsurances',
      '/integrations/stenci/insurance-plans': 'listInsurancePlans',
      '/integrations/stenci/professionals': 'listProfessionals',
      '/integrations/stenci/test-connection': 'testConnection',
      '/integrations/stenci/patients/search': 'searchPatients',
    }
    if (names[path]) {
      const operation: StenciOperation = { name: names[path] }
      if (operation.name === 'searchPatients')
        Object.assign(operation, {
          search: String(error.config.params?.search || ''),
          limit: Number(error.config.params?.limit) || 30,
          offset: Number(error.config.params?.offset) || 0,
        })
      await requestStenciRefresh(operation)
      return api.request({ ...error.config, _stenciRetried: true })
    }
  }
  if (
    !publicPhysioFaceRequest &&
    (error.response?.status === 401 || error.response?.data?.code === 'STENCI_SESSION_EXPIRED')
  ) {
    if (error.response?.data?.code === 'STENCI_SESSION_EXPIRED') {
      sessionStorage.setItem('auth_message', 'Sua sessão expirou. Entre novamente.')
    }
    localStorage.removeItem('token')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
  if (
    !publicPhysioFaceRequest &&
    error.response?.status === 403 &&
    error.response?.data?.code !== 'STENCI_SESSION_EXPIRED' &&
    window.location.pathname !== '/sem-permissao'
  ) {
    window.location.assign('/sem-permissao')
  }
  return Promise.reject(error)
})
export default api
let physioSession: Promise<any> | null = null
export function ensurePhysioSession(): Promise<any> {
  if (!physioSession) {
    const token = localStorage.getItem('token')
    physioSession = api.post('/physio/session').then(({data}) => {
      if (localStorage.getItem('token') !== token) throw new Error('A sessão mudou durante a conexão da agenda.')
      if (data.token) localStorage.setItem('token',data.token)
      return data.profile
    }).finally(() => { physioSession = null })
  }
  return physioSession
}
