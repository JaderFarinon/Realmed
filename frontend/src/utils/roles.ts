import type { UsuarioRole } from '@/services/usuarios'

const ROLE_LEVEL: Record<UsuarioRole, number> = {
  masteradmin: 3,
  admin: 2,
  cac_coord: 2,
  cac: 1,
  secretaria: 1,
  user: 1,
  doctor: 1,
  nurse: 1,
  pharmacist: 1,
  patient: 0,
}

const normalizeRole = (role?: string | null): UsuarioRole | null => {
  if (!role) {
    return null
  }

  return (ROLE_LEVEL as Record<string, number>)[role] !== undefined
    ? (role as UsuarioRole)
    : null
}

export const canManageRole = (
  currentRole?: string | null,
  targetRole?: string | null,
): boolean => {
  const normalizedCurrent = normalizeRole(currentRole)
  const normalizedTarget = normalizeRole(targetRole)

  if (!normalizedCurrent || !normalizedTarget) {
    return false
  }

  if (normalizedCurrent === 'masteradmin') {
    return true
  }

  if (normalizedCurrent === 'admin') {
    return normalizedTarget !== 'masteradmin'
  }

  if (normalizedCurrent === 'cac_coord') {
    return normalizedTarget === 'cac' || normalizedTarget === 'secretaria'
  }

  const currentLevel = ROLE_LEVEL[normalizedCurrent] ?? -1
  const targetLevel = ROLE_LEVEL[normalizedTarget] ?? -1

  return currentLevel > targetLevel
}

