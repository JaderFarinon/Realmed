import axios from 'axios'
import { showPermissionDeniedModal } from '@/composables/usePermissionDeniedModal'

const removeTrailingSlashes = (value = '') => value.replace(/\/+$/, '')
const ensureLeadingSlash = (value = '') => (value.startsWith('/') ? value : `/${value}`)
const collapseDuplicateSlashes = (value = '') => value.replace(/\/{2,}/g, '/')
const isAbsoluteUrl = (value = '') => /^[a-z][a-z\d+\-.]*:/i.test(value)

const rawBaseApiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005'
const normalizedBaseApiUrl = removeTrailingSlashes(rawBaseApiUrl)
const apiBaseUrl = /\/api(?:\/|$)/i.test(normalizedBaseApiUrl)
  ? normalizedBaseApiUrl
  : `${normalizedBaseApiUrl}/api`
const dataSource = import.meta.env.VITE_DATA_SOURCE


const api = axios.create({
  baseURL: apiBaseUrl,
})

const parseBooleanFlag = (value) => value === true || value === 'true'

// Adiciona o token automaticamente se estiver no localStorage
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (!config.headers) {
    config.headers = {}
  }
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }


  if (typeof config.url === 'string' && isAbsoluteUrl(config.url) === false) {
    let normalizedUrl = collapseDuplicateSlashes(ensureLeadingSlash(config.url))

    const method = (config.method || 'get').toLowerCase()

    config.url = normalizedUrl
  }

  return config
})

// Redireciona para a tela de login quando o token expira ou é inválido
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    if (status === 401) {
      localStorage.removeItem('token')

      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    } else if (status === 403) {
      showPermissionDeniedModal()
    }
    return Promise.reject(error)
  },
)

export default api
