import axios from 'axios'

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
api.interceptors.response.use(undefined, (error) => {
  if (error.response?.status === 401 || error.response?.data?.code === 'STENCI_SESSION_EXPIRED') {
    if (error.response?.data?.code === 'STENCI_SESSION_EXPIRED') {
      sessionStorage.setItem('auth_message', 'Sua sessão expirou. Entre novamente.')
    }
    localStorage.removeItem('token')
    if (window.location.pathname !== '/login') window.location.assign('/login')
  }
  return Promise.reject(error)
})
export default api
