<template>
  <div class="flex flex-col flex-1 min-h-0 gap-4">
    <div class="grid grid-cols-1 gap-3 sm:grid-cols-4">
      <div class="sm:col-span-2">
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buscar</label>
        <input
          v-model="busca"
          type="search"
          placeholder="Nome, e-mail ou login"
          class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
        />
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Perfil</label>
        <select
          v-model="filtroRole"
          class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
        >
          <option value="">Todos</option>
          <option v-for="option in filtroRoleOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
      <div>
        <label class="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
        <select
          v-model="filtroStatus"
          class="h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 text-sm text-gray-800 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
        >
          <option value="">Todos</option>
          <option v-for="option in statusOptions" :key="option.value" :value="option.value">
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>

    <div class="flex-1 overflow-hidden">
      <div class="overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-800/60">
            <tr>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Nome
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                E-mail
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Login
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Perfil
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Unidades
              </th>
              <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="carregando">
              <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Carregando usuários...
              </td>
            </tr>
            <tr v-else-if="erroCarregamento">
              <td colspan="6" class="px-4 py-6 text-center text-sm text-red-500">
                {{ erroCarregamento }}
              </td>
            </tr>
            <tr v-else-if="usuarios.length === 0">
              <td colspan="6" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum usuário encontrado com os filtros selecionados.
              </td>
            </tr>
            <tr
              v-for="usuario in usuarios"
              v-else
              :key="usuario.id"
              class="border-b border-gray-100 last:border-b-0 dark:border-gray-800 cursor-pointer transition-colors"
              :class="[
                selecionado?.id === usuario.id
                  ? 'bg-gray-100 dark:bg-gray-800'
                  : 'hover:bg-gray-50 dark:hover:bg-white/5',
              ]"
              @click="aoSelecionar(usuario)"
            >
              <td class="px-4 py-3 text-sm text-gray-800 dark:text-gray-200">
                <div class="font-medium">{{ usuario.nome }}</div>
                <div v-if="usuario.telefone" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ usuario.telefone }}
                </div>
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {{ usuario.email }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                {{ usuario.login }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-700 dark:text-gray-200">
                {{ roleLabels[usuario.role] || usuario.role }}
              </td>
              <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                <div v-if="usuario.unidades.length" class="flex flex-wrap gap-2">
                  <span
                    v-for="unidade in usuario.unidades"
                    :key="unidade.id"
                    class="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-200"
                  >
                    {{ unidade.nome }}
                  </span>
                </div>
                <span v-else class="text-xs text-gray-400 dark:text-gray-500">Sem unidades</span>
              </td>
              <td class="px-4 py-3 text-sm">
                <span
                  class="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
                  :class="statusBadgeClasses(usuario.status)"
                >
                  {{ statusLabel(usuario.status) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { defineEmits, defineExpose, defineProps, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  listarUsuarios,
  type Usuario,
  type UsuarioFiltro,
  type UsuarioRole,
  type UsuarioStatus,
} from '@/services/usuarios'

type RoleLabels = Record<UsuarioRole, string>

type StatusOption = { value: UsuarioStatus; label: string }

const props = defineProps<{
  roleLabels: RoleLabels
  statusOptions: StatusOption[]
  filtroRoleOptions: Array<{ value: UsuarioRole; label: string }>
  podeGerenciarRole: (role: UsuarioRole) => boolean
}>()

const emit = defineEmits<{
  (e: 'selecionado-change', usuario: Usuario | null): void
  (e: 'carregando-change', carregando: boolean): void
  (e: 'erro', mensagem: string): void
}>()

const extrairMensagemErro = (erro: unknown, padrao: string) => {
  if (typeof erro === 'object' && erro !== null) {
    const resposta = (erro as { response?: { data?: { error?: unknown } } }).response
    const mensagem = resposta?.data?.error
    if (typeof mensagem === 'string' && mensagem.trim().length > 0) {
      return mensagem
    }
  }

  if (erro instanceof Error && erro.message.trim().length > 0) {
    return erro.message
  }

  return padrao
}

const usuarios = ref<Usuario[]>([])
const carregando = ref(false)
const erroCarregamento = ref('')
const busca = ref('')
const filtroRole = ref<UsuarioRole | ''>('')
const filtroStatus = ref<UsuarioStatus | ''>('')
const selecionado = ref<Usuario | null>(null)
const ultimoSelecionadoId = ref<number | null>(null)

let buscaTimeout: ReturnType<typeof setTimeout> | null = null

const statusLabel = (status: UsuarioStatus) =>
  props.statusOptions.find((opt) => opt.value === status)?.label ?? status

const statusBadgeClasses = (status: UsuarioStatus) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
    case 'blocked':
      return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-300'
    default:
      return 'bg-gray-200 text-gray-600 dark:bg-gray-800/60 dark:text-gray-300'
  }
}

const construirFiltros = (): UsuarioFiltro => ({
  search: busca.value.trim() || undefined,
  role: filtroRole.value || undefined,
  status: filtroStatus.value || undefined,
})

const restaurarSelecao = () => {
  if (!ultimoSelecionadoId.value) {
    selecionado.value = null
    return
  }
  const encontrado = usuarios.value.find((usuario) => usuario.id === ultimoSelecionadoId.value) || null
  selecionado.value = encontrado
}

const carregarUsuarios = async () => {
  carregando.value = true
  emit('carregando-change', true)
  erroCarregamento.value = ''
  try {
    const lista = await listarUsuarios(construirFiltros())
    usuarios.value = [...lista].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
    restaurarSelecao()
  } catch (error: unknown) {
    const mensagem = extrairMensagemErro(error, 'Não foi possível carregar os usuários.')
    erroCarregamento.value = mensagem
    emit('erro', mensagem)
    usuarios.value = []
  } finally {
    carregando.value = false
    emit('carregando-change', false)
  }
}

const limparSelecao = () => {
  selecionado.value = null
  ultimoSelecionadoId.value = null
}

const aoSelecionar = (usuario: Usuario) => {
  if (selecionado.value?.id === usuario.id) {
    return
  }
  selecionado.value = usuario
}

watch(selecionado, (novo) => {
  ultimoSelecionadoId.value = novo?.id ?? null
  emit('selecionado-change', novo ?? null)
})

const aplicarBuscaComDebounce = () => {
  if (buscaTimeout) {
    clearTimeout(buscaTimeout)
  }
  buscaTimeout = setTimeout(() => {
    carregarUsuarios().catch(() => {})
  }, 400)
}

watch(busca, aplicarBuscaComDebounce)
watch([filtroRole, filtroStatus], () => {
  carregarUsuarios().catch(() => {})
})

onMounted(() => {
  carregarUsuarios().catch(() => {})
})

onBeforeUnmount(() => {
  if (buscaTimeout) {
    clearTimeout(buscaTimeout)
  }
})

const atualizarUsuario = (usuario: Usuario) => {
  const indice = usuarios.value.findIndex((item) => item.id === usuario.id)
  if (indice >= 0) {
    usuarios.value.splice(indice, 1, usuario)
  } else {
    usuarios.value.unshift(usuario)
  }
  usuarios.value.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))
  selecionado.value = usuario
}

const removerUsuario = (usuarioId: number) => {
  usuarios.value = usuarios.value.filter((usuario) => usuario.id !== usuarioId)
  if (ultimoSelecionadoId.value === usuarioId) {
    limparSelecao()
  }
}

const selecionarUsuario = (usuarioId: number | null) => {
  if (!usuarioId) {
    limparSelecao()
    return
  }
  const encontrado = usuarios.value.find((usuario) => usuario.id === usuarioId) || null
  selecionado.value = encontrado
}

defineExpose({
  recarregar: carregarUsuarios,
  atualizarUsuario,
  removerUsuario,
  selecionarUsuario,
  limparSelecao,
})
</script>
