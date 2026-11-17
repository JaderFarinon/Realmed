import { computed } from 'vue'
import { useRoute } from 'vue-router'
import type { AxiosRequestConfig } from 'axios'
import realApi, { ensurePhysioSession, ensurePhysioPreviewSession } from '@/plugins/axios'

export function usePhysioAccess() {
  const route = useRoute()
  const isPreview = computed(() => route.meta.physioPreview === true)
  const professionalId = computed(() => String(route.params.professionalId || ''))
  const prefix = () => isPreview.value ? `/physio/admin-preview/${encodeURIComponent(professionalId.value)}` : '/physio'
  const endpoint = (path: string) => path.startsWith('/physio/') ? prefix() + path.replace(/^\/physio/, '') : path
  const api = {
    get: <T = any>(path: string, config?: AxiosRequestConfig) => realApi.get<T>(endpoint(path), config),
    post: <T = any>(path: string, body?: unknown, config?: AxiosRequestConfig) => realApi.post<T>(endpoint(path), body, config),
  }
  const ensureSession = () => isPreview.value ? ensurePhysioPreviewSession(professionalId.value) : ensurePhysioSession()
  const appPath = (path = '/modo-fisio') => isPreview.value ? `/modo-fisio/visualizar/${encodeURIComponent(professionalId.value)}` + path.replace(/^\/modo-fisio/, '') : path
  return { api, isPreview, professionalId, ensureSession, appPath }
}
