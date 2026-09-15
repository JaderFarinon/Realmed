import type { SidebarMenuGroup, SidebarMenuItem } from '@/constants/sidebarMenu'

export interface PermissionModule {
  key: string
  label: string
  path?: string
}

export interface PermissionModuleGroup {
  title: string
  modules: PermissionModule[]
}

const sanitizeKey = (value: string): string => {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9/]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-|-$/g, '')
}

const keyFromPath = (path: string): string => {
  const normalized = path.replace(/^\//, '')
  if (normalized.length === 0) {
    return 'root'
  }
  return normalized.replace(/\//g, '.').replace(/[^a-zA-Z0-9.]+/g, '-').toLowerCase()
}

const buildModulesFromItems = (
  items: SidebarMenuItem[] = [],
  parents: string[] = [],
): PermissionModule[] => {
  const modules: PermissionModule[] = []

  items.forEach((item) => {
    const currentLabelParts = [...parents, item.name]
    const label = currentLabelParts.join(' / ')

    if (item.path) {
      modules.push({
        key: keyFromPath(item.path),
        label,
        path: item.path,
      })
    } else {
      const fallbackKey = sanitizeKey(label)
      modules.push({
        key: fallbackKey,
        label,
      })
    }

    if (item.subItems && item.subItems.length > 0) {
      modules.push(...buildModulesFromItems(item.subItems, currentLabelParts))
    }
  })

  return modules
}

const normalizePermissionModule = (module: PermissionModule): PermissionModule | null => {
  if (!module) return null

  const normalizedKey = module.key?.trim()
  const normalizedLabel = module.label?.trim()
  const path = module.path?.trim()

  if (!normalizedKey || !normalizedLabel) {
    return null
  }

  return {
    key: normalizedKey,
    label: normalizedLabel,
    ...(path ? { path } : {}),
  }
}

export const buildPermissionModuleGroups = (
  menuGroups: SidebarMenuGroup[],
  extraModules: PermissionModule[] = [],
  extraGroupTitle = 'Outras telas',
): PermissionModuleGroup[] => {
  const groups = menuGroups.map((group) => {
    const modules = buildModulesFromItems(group.items, [group.title])

    const uniqueModules = new Map<string, PermissionModule>()
    modules.forEach((module) => {
      if (!uniqueModules.has(module.key)) {
        uniqueModules.set(module.key, module)
      }
    })

    return {
      title: group.title,
      modules: Array.from(uniqueModules.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    }
  })

  const existingKeys = new Set(
    groups.flatMap((group) => group.modules.map((module) => module.key.toLowerCase())),
  )

  const normalizedExtras = extraModules
    .map((module) => normalizePermissionModule(module))
    .filter((module): module is PermissionModule => Boolean(module))
    .filter((module) => !existingKeys.has(module.key.toLowerCase()))

  if (normalizedExtras.length > 0) {
    const uniqueExtras = new Map<string, PermissionModule>()

    normalizedExtras.forEach((module) => {
      const key = module.key.toLowerCase()
      if (!uniqueExtras.has(key)) {
        uniqueExtras.set(key, module)
      }
    })

    groups.push({
      title: extraGroupTitle,
      modules: Array.from(uniqueExtras.values()).sort((a, b) => a.label.localeCompare(b.label, 'pt-BR')),
    })
  }

  return groups
}

export const flattenPermissionModules = (groups: PermissionModuleGroup[]): PermissionModule[] => {
  return groups.flatMap((group) => group.modules)
}

export { keyFromPath }
