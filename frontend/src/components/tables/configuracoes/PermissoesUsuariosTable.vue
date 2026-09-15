<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div
      class="flex items-center justify-between gap-3 border-b border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-300"
    >
      <span class="font-medium text-gray-700 dark:text-gray-200">Usuários cadastrados</span>
      <span class="text-xs text-gray-400 dark:text-gray-500">
        Selecione um usuário para gerenciar as permissões.
      </span>
    </div>

    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-800">
        <thead class="bg-gray-50 dark:bg-gray-800/60">
          <tr>
            <th
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Nome
            </th>
            <th
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              E-mail
            </th>
            <th
              class="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400"
            >
              Perfil
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr v-if="carregando">
            <td colspan="3" class="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Carregando usuários...
            </td>
          </tr>
          <tr v-else-if="erroCarregamento">
            <td colspan="3" class="px-5 py-6 text-center text-sm text-red-500">
              {{ erroCarregamento }}
            </td>
          </tr>
          <tr v-else-if="usuarios.length === 0">
            <td colspan="3" class="px-5 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
              Nenhum usuário disponível para gerenciamento de permissões.
            </td>
          </tr>
          <tr
            v-for="usuario in usuariosPaginados"
            v-else
            :key="usuario.id"
            :class="[
              'cursor-pointer transition',
              selecionado?.id === usuario.id
                ? 'bg-brand-50/60 dark:bg-brand-500/10'
                : 'hover:bg-gray-50 dark:hover:bg-white/[0.04]',
            ]"
            @click="selecionar(usuario)"
            @dblclick="emitirDuploClique(usuario)"
          >
            <td class="px-5 py-4 text-sm text-gray-800 dark:text-gray-200">
              <div class="font-medium">{{ usuario.nome }}</div>
              <div v-if="usuario.login" class="text-xs text-gray-500 dark:text-gray-400">
                {{ usuario.login }}
              </div>
            </td>
            <td class="px-5 py-4 text-sm text-gray-600 dark:text-gray-300">
              {{ usuario.email || 'Não informado' }}
            </td>
            <td class="px-5 py-4 text-sm text-gray-700 dark:text-gray-300">
              {{ roleLabels[usuario.role] || usuario.role }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div
      v-if="usuarios.length > 0"
      class="flex flex-col gap-2 border-t border-gray-100 p-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between"
    >
      <div>Mostrando página {{ paginaAtualHuman }} de {{ totalPaginas }}</div>
      <div class="flex flex-wrap items-center gap-1">
        <template v-for="page in paginasVisiveis" :key="`${page}-${paginaAtual}`">
          <button
            v-if="page === 'prev' || page === 'next'"
            type="button"
            class="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
            @click="irParaPagina(page)"
          >
            ...
          </button>
          <button
            v-else
            type="button"
            class="rounded-lg px-3 py-1 text-xs font-medium"
            :class="
              page === paginaAtual
                ? 'bg-brand-500 text-white shadow-theme-sm'
                : 'border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10'
            "
            @click="irParaPagina(page)"
          >
            {{ (page as number) + 1 }}
          </button>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineExpose, defineProps, ref, watch } from 'vue'

import { listarUsuarios, type Usuario } from '@/services/usuarios'

const props = defineProps<{
  roleLabels: Record<string, string>
  podeAcessar: boolean
  itensPorPagina?: number
}>()

const emit = defineEmits<{
  (e: 'selecionado-change', usuario: Usuario | null): void
  (e: 'usuario-dblclick', usuario: Usuario): void
  (e: 'erro', mensagem: string): void
  (e: 'carregando-change', carregando: boolean): void
}>()

const usuarios = ref<Usuario[]>([])
const carregando = ref(false)
const erroCarregamento = ref('')
const paginaAtual = ref(0)
const selecionado = ref<Usuario | null>(null)
const ultimoSelecionadoId = ref<number | null>(null)

const itensPorPagina = computed(() => props.itensPorPagina ?? 10)
const maxPaginasVisiveis = 5

const totalPaginas = computed(() => {
  if (usuarios.value.length === 0) return 1
  return Math.max(1, Math.ceil(usuarios.value.length / itensPorPagina.value))
})

const paginaAtualHuman = computed(() => (usuarios.value.length ? paginaAtual.value + 1 : 0))

const paginasVisiveis = computed(() => {
  const total = totalPaginas.value
  const current = paginaAtual.value

  if (total <= maxPaginasVisiveis) {
    return Array.from({ length: total }, (_, index) => index)
  }

  if (current <= 2) {
    return [...Array.from({ length: maxPaginasVisiveis }, (_, index) => index), 'next']
  }

  if (current >= total - 3) {
    return ['prev', ...Array.from({ length: maxPaginasVisiveis }, (_, index) => total - maxPaginasVisiveis + index)]
  }

  return ['prev', ...Array.from({ length: maxPaginasVisiveis - 2 }, (_, index) => current - 2 + index), 'next']
})

const usuariosPaginados = computed(() => {
  const start = paginaAtual.value * itensPorPagina.value
  const end = start + itensPorPagina.value
  return usuarios.value.slice(start, end)
})

const emitirSelecao = (usuario: Usuario | null) => {
  emit('selecionado-change', usuario)
}

const selecionar = (usuario: Usuario) => {
  selecionado.value = usuario
  ultimoSelecionadoId.value = usuario.id
  emitirSelecao(usuario)
}

const limparSelecaoInterna = () => {
  selecionado.value = null
  ultimoSelecionadoId.value = null
  emitirSelecao(null)
}

const emitirDuploClique = (usuario: Usuario) => {
  emit('usuario-dblclick', usuario)
}

const normalizarChaveOrdenacao = (usuario: Usuario): string => {
  const normalizar = (valor: string | null | undefined): string =>
    typeof valor === 'string' ? valor.trim() : ''

  const nome = normalizar(usuario.nome)
  if (nome) {
    return nome
  }

  const login = normalizar(usuario.login)
  if (login) {
    return login
  }

  const email = normalizar(usuario.email)
  if (email) {
    return email
  }

  return String(usuario.id)
}

const ordenarUsuarios = (lista: Usuario[]) =>
  [...lista].sort((a, b) => normalizarChaveOrdenacao(a).localeCompare(normalizarChaveOrdenacao(b), 'pt-BR'))

const extrairMensagemErro = (erro: unknown, padrao: string): string => {
  if (typeof erro === 'object' && erro !== null) {
    const resposta = (erro as { response?: { data?: { error?: unknown } } }).response
    const mensagem = resposta?.data?.error
    if (typeof mensagem === 'string' && mensagem.trim()) {
      return mensagem
    }
  }

  if (erro instanceof Error && erro.message.trim()) {
    return erro.message
  }

  return padrao
}

const ajustarPaginaAtual = () => {
  if (paginaAtual.value > totalPaginas.value - 1) {
    paginaAtual.value = Math.max(0, totalPaginas.value - 1)
  }
}

const garantirSelecionadoVisivel = () => {
  if (!selecionado.value) return

  const index = usuarios.value.findIndex((usuario) => usuario.id === selecionado.value?.id)
  if (index === -1) return

  const start = paginaAtual.value * itensPorPagina.value
  const end = start + itensPorPagina.value

  if (index < start || index >= end) {
    paginaAtual.value = Math.floor(index / itensPorPagina.value)
  }
}

const carregarUsuarios = async () => {
  if (!props.podeAcessar) {
    usuarios.value = []
    limparSelecaoInterna()
    paginaAtual.value = 0
    erroCarregamento.value = ''
    return
  }

  carregando.value = true
  emit('carregando-change', true)
  erroCarregamento.value = ''

  try {
    const lista = await listarUsuarios()
    const ordenada = ordenarUsuarios(lista)
    usuarios.value = ordenada

    if (ultimoSelecionadoId.value) {
      const encontrado = ordenada.find((usuario) => usuario.id === ultimoSelecionadoId.value) ?? null
      selecionado.value = encontrado
      if (!encontrado) {
        ultimoSelecionadoId.value = null
      }
    }

    ajustarPaginaAtual()
    garantirSelecionadoVisivel()
  } catch (erro: unknown) {
    const mensagem = extrairMensagemErro(erro, 'Não foi possível carregar os usuários.')
    erroCarregamento.value = mensagem
    emit('erro', mensagem)
  } finally {
    carregando.value = false
    emit('carregando-change', false)
  }
}

const irParaPagina = (page: number | string) => {
  if (page === 'prev') {
    paginaAtual.value = Math.max(paginaAtual.value - (maxPaginasVisiveis - 2), 0)
  } else if (page === 'next') {
    paginaAtual.value = Math.min(paginaAtual.value + (maxPaginasVisiveis - 2), totalPaginas.value - 1)
  } else {
    paginaAtual.value = page as number
  }
}

watch(
  () => props.podeAcessar,
  async (habilitado) => {
    if (habilitado) {
      await carregarUsuarios()
    } else {
      usuarios.value = []
      limparSelecaoInterna()
      paginaAtual.value = 0
      erroCarregamento.value = ''
    }
  },
  { immediate: true },
)

watch(
  usuarios,
  () => {
    ajustarPaginaAtual()
    garantirSelecionadoVisivel()
  },
  { deep: true },
)

const selecionarUsuarioPorId = (id: number | null) => {
  if (!id) {
    limparSelecaoInterna()
    return
  }

  const encontrado = usuarios.value.find((usuario) => usuario.id === id)
  if (!encontrado) {
    limparSelecaoInterna()
    return
  }

  selecionar(encontrado)
  garantirSelecionadoVisivel()
}

defineExpose({
  recarregar: carregarUsuarios,
  limparSelecao: limparSelecaoInterna,
  selecionarUsuarioPorId,
  getSelecionado: () => selecionado.value,
})
</script>
