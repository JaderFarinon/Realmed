import axios from 'axios'
import { requestStenciRefresh, type StenciOperation } from '@/composables/useStenciRefresh'

const configuredUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005'
const origin = configuredUrl.replace(/\/+$/, '')
const api = axios.create({
  baseURL: /\/api$/i.test(origin) ? origin : `${origin}/api`,
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
api.interceptors.response.use(undefined, async (error) => {
  if (
    error.response?.status === 428 &&
    error.response?.data?.code === 'STENCI_REFRESH_REQUIRED' &&
    !error.config?._stenciRetried
  ) {
    const path = String(error.config.url || '').split('?')[0]
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
  if (error.response?.status === 401 || error.response?.data?.code === 'STENCI_SESSION_EXPIRED') {
    if (error.response?.data?.code === 'STENCI_SESSION_EXPIRED') {
      sessionStorage.setItem('auth_message', 'Sua sessão expirou. Entre novamente.')
    }
    localStorage.removeItem('token')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
  if (
    error.response?.status === 403 &&
    error.response?.data?.code !== 'STENCI_SESSION_EXPIRED' &&
    window.location.pathname !== '/sem-permissao'
  ) {
    window.location.assign('/sem-permissao')
  }
  return Promise.reject(error)
})
export default api
