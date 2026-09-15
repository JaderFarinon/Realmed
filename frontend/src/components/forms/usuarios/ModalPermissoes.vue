<template>
  <Modal v-if="aberto" full-screen-backdrop @close="emitFechar">
    <template #body>
      <div
        class="relative flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-theme-xl dark:bg-gray-900"
        :style="containerStyle"
      >
        <header class="flex flex-col gap-1 px-6 pb-4 pt-6 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div>
            <h2 class="text-xl font-semibold text-gray-800 dark:text-white/90">
              Permissões de acesso
            </h2>
            <p class="text-sm text-gray-500 dark:text-gray-400">
              Defina as ações permitidas para {{ usuario?.nome || usuario?.login || 'o usuário selecionado' }}.
            </p>
          </div>
          <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
            <span class="inline-flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1 dark:border-gray-700">
              <span class="h-2 w-2 rounded-full bg-brand-500"></span>
              {{ usuario?.role ? roleLabels[usuario.role] || usuario.role : 'Perfil não informado' }}
            </span>
          </div>
        </header>

        <div class="no-scrollbar flex-1 overflow-y-auto px-6 pb-6 sm:px-8 sm:pb-8 min-h-0">
          <div v-if="carregando" class="flex h-full items-center justify-center text-sm text-gray-500 dark:text-gray-400">
            Carregando permissões...
          </div>

          <div v-else class="flex flex-col gap-6">
            <div
              v-if="moduleGroups.length === 0"
              class="rounded-xl border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400"
            >
              Nenhum módulo disponível para configuração de permissões.
            </div>

            <div
              v-for="group in moduleGroups"
              v-else
              :key="group.title"
              class="rounded-2xl border border-gray-200 bg-gray-50/80 p-4 dark:border-gray-800 dark:bg-white/[0.04]"
            >
              <h3 class="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-400">
                {{ group.title }}
              </h3>
              <div class="overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                  <thead class="bg-white/70 dark:bg-gray-900/60">
                    <tr class="text-left">
                      <th class="px-4 py-3 font-semibold text-gray-600 dark:text-gray-300">Módulo</th>
                      <th
                        v-for="column in permissionColumns"
                        :key="column.field"
                        class="px-4 py-3 text-center font-semibold text-gray-600 dark:text-gray-300"
                      >
                        <div class="flex flex-col items-center gap-1">
                          <input
                            type="checkbox"
                            class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                            :checked="isColumnChecked(group, column.field)"
                            :indeterminate="isColumnIndeterminate(group, column.field)"
                            :disabled="isColumnDisabled(group)"
                            @change="
                              onColumnToggle(
                                group,
                                column.field,
                                ($event.target as HTMLInputElement).checked,
                              )
                            "
                          />
                          <span>{{ column.label }}</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr
                      v-for="module in group.modules"
                      :key="module.key"
                      class="bg-white text-gray-700 transition hover:bg-brand-50/60 dark:bg-gray-900 dark:text-gray-200 dark:hover:bg-brand-500/10"
                    >
                      <td class="px-4 py-3">
                        <span class="font-medium">{{ module.label }}</span>
                        <p v-if="module.path" class="text-xs text-gray-400 dark:text-gray-500">{{ module.path }}</p>
                      </td>
                      <td
                        v-for="column in permissionColumns"
                        :key="column.field"
                        class="px-4 py-3 text-center"
                      >
                        <input
                          v-model="permissions[module.key][column.field]"
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          :disabled="isPermissionReadOnly(module.key)"
                          :aria-readonly="isPermissionReadOnly(module.key) || undefined"
                          @change="onModuleFieldChange(module.key, column.field)"
                        />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        <footer class="flex flex-col gap-2 border-t border-gray-100 px-6 pb-6 pt-4 sm:flex-row sm:justify-end sm:px-8 sm:pb-8 sm:pt-6 dark:border-gray-800">
          <button
            type="button"
            class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.06] sm:w-auto"
            @click="emitFechar"
          >
            Cancelar
          </button>
          <button
            type="button"
            class="flex w-full items-center justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
            :disabled="salvando || carregando || !usuario"
            @click="salvar"
          >
            <span v-if="salvando" class="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></span>
            {{ salvando ? 'Salvando...' : 'Salvar alterações' }}
          </button>
        </footer>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'

import Modal from '@/components/ui/Modal.vue'
import type { PermissionModuleGroup } from '@/utils/permission-modules'
import { flattenPermissionModules } from '@/utils/permission-modules'
import { useToast } from '@/composables/useToast'
import {
  listarPermissoesPorUsuario,
  salvarPermissoesPorUsuario,
  type ModulePermissionPayload,
} from '@/services/permissoes'

interface UsuarioResumo {
  id: number
  nome?: string
  login?: string
  role?: string
}

const props = defineProps<{
  aberto: boolean
  usuario: UsuarioResumo | null
  moduleGroups: PermissionModuleGroup[]
}>()

const emit = defineEmits<{
  (event: 'fechar'): void
  (event: 'salvo', payload: ModulePermissionPayload[]): void
  (event: 'erro', mensagem: string): void
}>()

const carregando = ref(false)
const salvando = ref(false)
const registrosAtuais = ref<ModulePermissionPayload[]>([])
const toast = useToast()

const permissions = reactive<Record<string, ModulePermissionPayload>>({})

const permissionColumns = [
  { field: 'canView', label: 'Ver' },
  { field: 'canCreate', label: 'Cadastrar' },
  { field: 'canEdit', label: 'Editar' },
  { field: 'canDelete', label: 'Excluir' },
] as const

type PermissionToggleField = (typeof permissionColumns)[number]['field']

const modulesFlattened = computed(() => flattenPermissionModules(props.moduleGroups))

const isAdminUser = computed(() => props.usuario?.role === 'admin')

const ADMIN_PERMISSION_MODULE_KEY_SET = new Set<string>(['configuracoes.permissoes'])

const forcedAdminPermissionModuleKeys = computed(() => {
  const keys = new Set<string>()

  modulesFlattened.value.forEach((module) => {
    if (ADMIN_PERMISSION_MODULE_KEY_SET.has(module.key)) {
      keys.add(module.key)
    }
  })

  return keys
})

const isModuleForced = (moduleKey: string): boolean =>
  isAdminUser.value && forcedAdminPermissionModuleKeys.value.has(moduleKey)

const roleLabels: Record<string, string> = {
  masteradmin: 'Master Admin',
  admin: 'Administrador',
  cac_coord: 'Coordenação do CAC',
  cac: 'CAC',
  secretaria: 'Secretaria',
  user: 'Usuário',
  doctor: 'Médico',
  nurse: 'Enfermeiro(a)',
  pharmacist: 'Farmacêutico(a)',
  patient: 'Paciente',
}

const containerStyle = computed(() => ({
  maxHeight: 'calc(100% - 3rem)',
  minHeight: '0px',
}))

const resetPermissions = () => {
  Object.keys(permissions).forEach((key) => {
    delete permissions[key]
  })
}

const normalizePermission = (
  moduleKey: string,
  base?: Partial<ModulePermissionPayload>,
): ModulePermissionPayload => {
  const normalized: ModulePermissionPayload = {
    moduleKey,
    canView: Boolean(base?.canView),
    canCreate: Boolean(base?.canCreate),
    canEdit: Boolean(base?.canEdit),
    canDelete: Boolean(base?.canDelete),
  }

  if (!normalized.canView) {
    normalized.canCreate = false
    normalized.canEdit = false
    normalized.canDelete = false
  }

  if (normalized.canCreate || normalized.canEdit || normalized.canDelete) {
    normalized.canView = true
  }

  if (isModuleForced(moduleKey)) {
    normalized.canView = true
    normalized.canCreate = true
    normalized.canEdit = true
    normalized.canDelete = true
  }

  return normalized
}

const applyPermissions = (records: ModulePermissionPayload[] = []) => {
  const recordMap = new Map(records.map((item) => [item.moduleKey, item]))
  const defaults = modulesFlattened.value

  resetPermissions()

  defaults.forEach((module) => {
    const stored = recordMap.get(module.key)
    permissions[module.key] = normalizePermission(module.key, stored)
  })

  enforceAdminPermissions()
}

const onViewToggle = (moduleKey: string) => {
  const permission = permissions[moduleKey]
  if (!permission) return

  if (!permission.canView) {
    permission.canCreate = false
    permission.canEdit = false
    permission.canDelete = false
  }
}

const onPrivilegeToggle = (moduleKey: string) => {
  const permission = permissions[moduleKey]
  if (!permission) return

  if (permission.canCreate || permission.canEdit || permission.canDelete) {
    permission.canView = true
  }
}

const enforceAdminPermissions = () => {
  if (!isAdminUser.value) {
    return
  }

  forcedAdminPermissionModuleKeys.value.forEach((moduleKey) => {
    const permission = permissions[moduleKey]

    if (!permission) {
      permissions[moduleKey] = normalizePermission(moduleKey, {
        canView: true,
        canCreate: true,
        canEdit: true,
        canDelete: true,
      })
      return
    }

    permission.canView = true
    permission.canCreate = true
    permission.canEdit = true
    permission.canDelete = true
  })
}

const isPermissionReadOnly = (moduleKey: string): boolean => isModuleForced(moduleKey)

const onModuleFieldChange = (moduleKey: string, field: PermissionToggleField) => {
  if (field === 'canView') {
    onViewToggle(moduleKey)
  } else {
    onPrivilegeToggle(moduleKey)
  }

  enforceAdminPermissions()
}

const isColumnChecked = (
  group: PermissionModuleGroup,
  field: PermissionToggleField,
): boolean => {
  return group.modules.every((module) => permissions[module.key]?.[field])
}

const isColumnIndeterminate = (
  group: PermissionModuleGroup,
  field: PermissionToggleField,
): boolean => {
  const hasTrue = group.modules.some((module) => permissions[module.key]?.[field])
  return hasTrue && !isColumnChecked(group, field)
}

const isColumnDisabled = (group: PermissionModuleGroup): boolean =>
  group.modules.every((module) => isModuleForced(module.key))

const toggleColumn = (
  group: PermissionModuleGroup,
  field: PermissionToggleField,
  value: boolean,
) => {
  group.modules.forEach((module) => {
    if (isModuleForced(module.key)) return

    const permission = permissions[module.key]
    if (!permission) return

    permission[field] = value

    if (field === 'canView') {
      onViewToggle(module.key)
    } else {
      onPrivilegeToggle(module.key)
    }
  })

  enforceAdminPermissions()
}

const onColumnToggle = (
  group: PermissionModuleGroup,
  field: PermissionToggleField,
  value: boolean,
) => {
  if (isColumnDisabled(group)) {
    return
  }

  toggleColumn(group, field, value)
}

const carregar = async () => {
  if (!props.usuario) {
    resetPermissions()
    registrosAtuais.value = []
    return
  }

  carregando.value = true

  try {
    const { permissions: registros } = await listarPermissoesPorUsuario(props.usuario.id)
    registrosAtuais.value = registros
    applyPermissions(registros)
  } catch (error: any) {
    if (error?.response?.status === 404) {
      registrosAtuais.value = []
      applyPermissions([])
      return
    }

    const mensagem = error?.response?.data?.error || 'Não foi possível carregar as permissões do usuário.'
    toast.error(mensagem)
    emit('erro', mensagem)
    registrosAtuais.value = []
    applyPermissions([])
  } finally {
    carregando.value = false
  }
}

const salvar = async () => {
  if (!props.usuario) {
    return
  }

  salvando.value = true

  try {
    const payload = modulesFlattened.value.map((module) =>
      normalizePermission(module.key, permissions[module.key]),
    )

    const { permissions: atualizadas } = await salvarPermissoesPorUsuario(props.usuario.id, payload)
    registrosAtuais.value = atualizadas
    applyPermissions(atualizadas)
    emit('salvo', atualizadas)
  } catch (error: any) {
    const mensagem = error?.response?.data?.error || 'Não foi possível salvar as permissões.'
    toast.error(mensagem)
    emit('erro', mensagem)
  } finally {
    salvando.value = false
  }
}

const emitFechar = () => {
  emit('fechar')
}

watch(
  () => props.aberto,
  (abertoAtual) => {
    if (abertoAtual) {
      applyPermissions(registrosAtuais.value)
      carregar()
    }
  },
)

watch(modulesFlattened, () => {
  applyPermissions(registrosAtuais.value)
})

watch(
  () => props.usuario?.role,
  () => {
    if (!props.aberto) return

    applyPermissions(registrosAtuais.value)
  },
)

watch(
  () => props.usuario?.id,
  (novoId, antigoId) => {
    if (!props.aberto) return

    if (!novoId) {
      registrosAtuais.value = []
      applyPermissions([])
      return
    }

    if (novoId !== antigoId) {
      carregar()
    }
  },
)
</script>
