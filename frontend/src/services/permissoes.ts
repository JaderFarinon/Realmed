import api from '@/plugins/axios'

export interface ModulePermissionPayload {
  moduleKey: string
  canView: boolean
  canCreate: boolean
  canEdit: boolean
  canDelete: boolean
}

export interface UserPermissionsResponse {
  userId: number
  permissions: ModulePermissionPayload[]
}

export const listarPermissoesPorUsuario = async (
  userId: number,
): Promise<UserPermissionsResponse> => {
  const { data } = await api.get<UserPermissionsResponse>(`/permissoes/${userId}`)
  return data
}

export const salvarPermissoesPorUsuario = async (
  userId: number,
  permissions: ModulePermissionPayload[],
): Promise<UserPermissionsResponse> => {
  const { data } = await api.post<UserPermissionsResponse>(`/permissoes/${userId}` , {
    permissions,
  })
  return data
}
