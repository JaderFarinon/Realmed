import { computed, ref } from 'vue'
import api from '@/plugins/axios'

export interface AuthUser {
  id: number
  username: string
  role: string
  name?: string | null
  email?: string | null
  permissionsEnabled?: boolean
  permissions?: Array<{
    moduleKey: string
    canView: boolean
    canCreate: boolean
    canEdit: boolean
    canDelete: boolean
  }>
}

const user = ref<AuthUser | null>(null)
let loading: Promise<AuthUser | null> | null = null

export function useAuthUser() {
  const loadUser = async () => {
    if (!localStorage.getItem('token')) {
      user.value = null
      return null
    }
    if (!loading)
      loading = api
        .get<{ user: AuthUser }>('/auth/me')
        .then(({ data }) => (user.value = data.user))
        .catch((error: { response?: { status?: number } }) => {
          if (error.response?.status === 401 || error.response?.status === 403) {
            localStorage.removeItem('token')
            user.value = null
            return null
          }
          throw error
        })
        .finally(() => {
          loading = null
        })
    return loading
  }
  const clearUser = () => {
    user.value = null
  }
  const canOperational = (
    moduleKey: string,
    permission: 'canView' | 'canCreate' | 'canEdit' | 'canDelete' = 'canEdit',
  ) => {
    if (!user.value) return false
    if (user.value.permissionsEnabled === false || user.value.role === 'masteradmin') return true
    return Boolean(
      user.value.permissions?.find((item) => item.moduleKey === moduleKey)?.[permission],
    )
  }
  return {
    authUser: computed(() => user.value),
    role: computed(() => user.value?.role ?? null),
    loadUser,
    clearUser,
    canOperational,
  }
}
