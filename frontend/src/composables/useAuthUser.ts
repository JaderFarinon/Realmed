import { computed, ref } from 'vue'

import api from '@/plugins/axios'

export interface ModulePermission {
  moduleKey: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface AuthUser {
  id: number
  role?: string | null
  username?: string | null
  status?: string | null
  name?: string | null
  email?: string | null
  personId?: number | null
  avatarUrl?: string | null
  permissions?: ModulePermission[]
}

const authUser = ref<AuthUser | null>(null)
const isLoading = ref(false)
const isLoaded = ref(false)
let loadPromise: Promise<AuthUser | null> | null = null

const resetLoadPromise = () => {
  loadPromise = null
}

const normalizeModulePermission = (value: unknown): ModulePermission | null => {
  if (!value || typeof value !== 'object') {
    return null
  }

  const permission = value as Record<string, unknown>
  const moduleKey = typeof permission.moduleKey === 'string' ? permission.moduleKey.trim() : ''

  if (!moduleKey) {
    return null
  }

  return {
    moduleKey,
    canView: Boolean(permission.canView),
    canCreate: Boolean(permission.canCreate),
    canEdit: Boolean(permission.canEdit),
    canDelete: Boolean(permission.canDelete),
  }
}

const normalizePermissions = (value: unknown): ModulePermission[] => {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizeModulePermission(item))
    .filter((item): item is ModulePermission => Boolean(item))
}

const fetchAuthenticatedUser = async (): Promise<AuthUser | null> => {
  isLoading.value = true
  try {
    const { data } = await api.get<{ user?: AuthUser | null }>('/auth/me')
    const user = data?.user ?? null

    if (user) {
      authUser.value = {
        ...user,
        permissions: normalizePermissions(user.permissions),
      }
    } else {
      authUser.value = null
    }
    return authUser.value
  } catch (error) {
    authUser.value = null
    throw error
  } finally {
    isLoading.value = false
    isLoaded.value = true
  }
}

const loadUser = async (forceReload = false): Promise<AuthUser | null> => {
  if (forceReload) {
    resetLoadPromise()
    isLoaded.value = false
  }

  if (!loadPromise) {
    loadPromise = fetchAuthenticatedUser().catch((error) => {
      resetLoadPromise()
      throw error
    })
  }

  return loadPromise
}

export const useAuthUser = () => {
  const role = computed(() => authUser.value?.role ?? null)
  const normalizedRole = computed(() => (role.value ?? '').toLowerCase())
  const permissions = computed(() => authUser.value?.permissions ?? [])

  const permissionMap = computed(() => {
    const map = new Map<string, ModulePermission>()

    permissions.value.forEach((permission) => {
      if (!permission?.moduleKey) {
        return
      }

      const key = permission.moduleKey.toLowerCase()

      if (!map.has(key)) {
        map.set(key, permission)
      }
    })

    return map
  })

  const hasModulePermission = (
    moduleKey: string,
    action: 'view' | 'create' | 'edit' | 'delete' = 'view',
  ): boolean => {
    const key = typeof moduleKey === 'string' ? moduleKey.trim().toLowerCase() : ''

    if (!key) {
      return false
    }

    if (normalizedRole.value === 'masteradmin' || normalizedRole.value === 'admin') {
      return true
    }

    const permission = permissionMap.value.get(key)

    if (!permission) {
      return false
    }

    switch (action) {
      case 'create':
        return permission.canCreate
      case 'edit':
        return permission.canEdit
      case 'delete':
        return permission.canDelete
      case 'view':
      default:
        return permission.canView
    }
  }

  const refreshUser = () => loadUser(true)

  const clearUser = () => {
    authUser.value = null
    isLoaded.value = false
    resetLoadPromise()
  }

  return {
    authUser,
    role,
    permissions,
    permissionMap,
    hasModulePermission,
    isLoading,
    isLoaded,
    loadUser,
    refreshUser,
    clearUser,
  }
}
