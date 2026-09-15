<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar convênio (nome, registro ANS, cnpj, telefone, email)..."
        class="w-full max-w-md px-3 py-2 text-sm border rounded"
      />
    </div>
    <div ref="tableContainer" class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Nome</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Registro ANS</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">CNPJ</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Telefone</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">E-mail</p>
            </th>
            <th class="px-5 py-3 text-right sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Origem</p>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in currentPageConvenios"
            :key="itemKey(item)"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionadoKey === itemKey(item) },
            ]"
            data-row="convenio"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.nome }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.registro_ans }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.cnpj }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.telefone }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.email }}</p>
            </td>
            <td class="px-5 py-1 text-right sm:px-6">
              <span class="inline-flex items-center justify-end gap-1 text-xs font-medium text-gray-500 dark:text-gray-400">
                <DatabaseIcon
                  v-if="item.origem === ORIGEM_INTEGRACAO"
                  class="h-4 w-4 text-gray-300"
                />
                {{ formatarOrigemConvenio(item.origem) }}
              </span>
            </td>

          </tr>
          <tr v-if="currentPageConvenios.length === 0">
            <td colspan="6" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum convênio encontrado
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800">
      <div></div>
      <div class="flex gap-1">
        <template v-for="page in visiblePages" :key="page + '-' + currentPage">
          <button v-if="page === 'prev' || page === 'next'"
            class="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded hover:bg-gray-200" @click="goToPage(page)"
            type="button">...</button>
          <button v-else class="px-3 py-1 text-sm rounded" :class="{
            'bg-gray-900 text-white': page === currentPage,
            'bg-gray-100 text-gray-700 hover:bg-gray-200': page !== currentPage,
          }" @click="goToPage(page)" type="button">
            {{ (page as number) + 1 }}
          </button>
        </template>
        <button class="px-2 py-1 text-gray-700 bg-gray-100 rounded"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === 0 }"
          @click="currentPage > 0 && (currentPage = currentPage - 1)" :disabled="currentPage === 0"
          aria-label="Página anterior">&lt;</button>
        <button class="px-2 py-1 text-gray-700 bg-gray-100 rounded"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === numPages - 1 }"
          @click="currentPage < numPages - 1 && (currentPage = currentPage + 1)"
          :disabled="currentPage === numPages - 1" aria-label="Próxima página">&gt;</button>
      </div>
      <div class="text-sm text-gray-500">Página {{ currentPageHuman }} de {{ numPages }}</div>
    </div>
    <ConvenioModal
      :isOpen="modalVisivel"
      :dados="convenioSelecionado"
      :somenteLeitura="somenteVisualizacao"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, defineEmits, defineExpose, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import api from '@/plugins/axios'

import ConvenioModal from '@/components/forms/convenios/ConvenioModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'
import { DatabaseIcon } from '@/icons'
import {
  buscarConveniosIntegrados,
  ORIGEM_INTEGRACAO,
  type ConvenioIntegrado,
  type ConvenioOrigem,
  formatarOrigemConvenio,
} from '@/services/convenios'

type ItemOrigem = ConvenioOrigem

interface Convenio {
  id: number | string
  nome: string
  registro_ans: string | null
  cnpj: string | null
  telefone: string | null
  email: string | null
  ativo: boolean
  origem: ItemOrigem
}

const emit = defineEmits<{
  (e: 'selecionado-change', payload: { item: Convenio | null; origem: ItemOrigem | null }): void
}>()

const props = defineProps<{ atualizar: boolean }>()

const convenios = ref<Convenio[]>([])
const filtro = ref('')
const perPage = ref(5)
const currentPage = ref(0)
const modalVisivel = ref(false)
const convenioSelecionado = ref<Convenio | null>(null)
const somenteVisualizacao = ref(false)
const selecionado = ref<Convenio | null>(null)
const ultimaChaveSelecionada = ref<string | null>(null)
const toast = useToast()

const tableContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const transformarConvenioIntegrado = (item: ConvenioIntegrado): Convenio => ({
  id: item.id,
  nome: item.nome,
  registro_ans: item.registro_ans,
  cnpj: item.cnpj,
  telefone: item.telefone,
  email: item.email,
  ativo: item.ativo,
  origem: item.origem,
})

const itemKey = (item: Convenio) => `${item.origem}-${String(item.id)}`

const selecionadoKey = computed(() => (selecionado.value ? itemKey(selecionado.value) : null))

const selecionar = (item: Convenio) => {
  selecionado.value = item
}

const isIntegracao = (item: Convenio | null) => item?.origem === ORIGEM_INTEGRACAO

watch(selecionado, (novo) => {
  ultimaChaveSelecionada.value = novo ? itemKey(novo) : null
  emit('selecionado-change', { item: novo, origem: novo?.origem ?? null })
})

const atualizarLinhasPorPagina = () => {
  const container = tableContainer.value
  if (!container) return

  const tabela = container.querySelector('table')
  const cabecalho = tabela?.querySelector('thead') as HTMLElement | null
  const primeiraLinha = tabela?.querySelector('tbody tr[data-row="convenio"]') as HTMLTableRowElement | null
  const linhaFallback = tabela?.querySelector('tbody tr') as HTMLTableRowElement | null

  const alturaCabecalho = cabecalho?.getBoundingClientRect().height ?? 0
  let alturaLinha = primeiraLinha?.getBoundingClientRect().height ?? 0
  if (!alturaLinha) {
    alturaLinha = linhaFallback?.getBoundingClientRect().height ?? 0
  }

  const alturaDisponivel = container.getBoundingClientRect().height - alturaCabecalho

  if (alturaDisponivel > 0 && alturaLinha > 0) {
    const linhas = Math.max(Math.floor(alturaDisponivel / alturaLinha), 1)
    if (linhas !== perPage.value) {
      perPage.value = linhas
    }
  }
}

const agendarAtualizacaoLinhas = () => {
  if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
    window.requestAnimationFrame(() => {
      nextTick(() => atualizarLinhasPorPagina())
    })
  } else {
    nextTick(() => atualizarLinhasPorPagina())
  }
}

const handleResize = () => {
  agendarAtualizacaoLinhas()
}

const conveniosFiltrados = computed(() => {
  let lista = convenios.value.slice()
  if (filtro.value) {
    const termo = filtro.value.toLowerCase()
    lista = lista.filter((item) => {
      const nome = (item.nome ?? '').toLowerCase()
      const registro = (item.registro_ans ?? '').toLowerCase()
      const cnpjValor = (item.cnpj ?? '').toLowerCase()
      const telefoneValor = (item.telefone ?? '').toLowerCase()
      const emailValor = (item.email ?? '').toLowerCase()
      return [nome, registro, cnpjValor, telefoneValor, emailValor].some((campo) => campo.includes(termo))
    })
  }
  return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
})

const numPages = computed(() => {
  const pages = Math.ceil(conveniosFiltrados.value.length / perPage.value)
  return pages > 0 ? pages : 1
})

const currentPageConvenios = computed(() =>
  conveniosFiltrados.value.slice(
    perPage.value * currentPage.value,
    perPage.value * (currentPage.value + 1),
  ),
)

const currentPageHuman = computed(() => currentPage.value + 1)
const maxVisiblePages = 8
const visiblePages = computed(() => {
  const total = numPages.value
  const current = currentPage.value

  if (total <= maxVisiblePages) {
    return Array.from({ length: total }, (_, i) => i)
  }
  if (current <= 3) {
    return [...Array.from({ length: maxVisiblePages }, (_, i) => i), 'next']
  }
  if (current >= total - 4) {
    return ['prev', ...Array.from({ length: maxVisiblePages }, (_, i) => total - maxVisiblePages + i)]
  }
  return ['prev', ...Array.from({ length: maxVisiblePages - 2 }, (_, i) => current - 3 + i), 'next']
})

const goToPage = (page: number | string) => {
  if (page === 'prev') {
    currentPage.value = Math.max(currentPage.value - (maxVisiblePages - 2), 0)
  } else if (page === 'next') {
    currentPage.value = Math.min(currentPage.value + (maxVisiblePages - 2), numPages.value - 1)
  } else {
    currentPage.value = page as number
  }
}

const carregarConvenios = async () => {
  const chaveAnterior = ultimaChaveSelecionada.value
  try {
    const dados = await buscarConveniosIntegrados()
    convenios.value = dados.map((item) => transformarConvenioIntegrado(item))

    const selecionadoAtualizado = chaveAnterior
      ? convenios.value.find((item) => itemKey(item) === chaveAnterior) ?? null
      : null
    selecionado.value = selecionadoAtualizado

    await nextTick()
    atualizarLinhasPorPagina()
    if (currentPage.value > numPages.value - 1) currentPage.value = numPages.value - 1
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao buscar Convênios' + (e.response?.data?.mensagem || ''))
    convenios.value = []
    selecionado.value = null
  }
}

const editarSelecionado = () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  somenteVisualizacao.value = false
  convenioSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const visualizarSelecionado = () => {
  if (!selecionado.value) return
  somenteVisualizacao.value = true
  convenioSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const excluir = async (id: number | string) => {
  if (!id) return
  if (!confirm('Confirma a exclusão do Convênio?')) return
  try {
    await api.delete(`/convenios/${id}`)
    toast.success('Convênio excluído com sucesso')
    carregarConvenios()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao excluir Convênio: ' + (e.response?.data?.mensagem || ''))
  }
}

const excluirSelecionado = async () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  await excluir(selecionado.value.id)
}

const fecharModal = (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  convenioSelecionado.value = null
  somenteVisualizacao.value = false
  if (precisaAtualizar) carregarConvenios()
}

const handleNotificacao = (n: { tipo: ToastType; mensagem: string }) => {
  if (n.tipo === 'success') {
    toast.success(n.mensagem)
  } else if (n.tipo === 'error') {
    toast.error(n.mensagem)
  } else {
    toast.info(n.mensagem)
  }
}

watch(() => props.atualizar, () => carregarConvenios())
watch(conveniosFiltrados, () => {
  if (currentPage.value > numPages.value - 1) {
    currentPage.value = numPages.value - 1
  }
  agendarAtualizacaoLinhas()
})

watch(numPages, (total) => {
  const ultimaPagina = Math.max(total - 1, 0)
  if (currentPage.value > ultimaPagina) {
    currentPage.value = ultimaPagina
  }
})

onMounted(() => {
  carregarConvenios()
  agendarAtualizacaoLinhas()
  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => atualizarLinhasPorPagina())
    nextTick(() => {
      if (tableContainer.value) {
        resizeObserver?.observe(tableContainer.value)
      }
    })
  }
  if (typeof window !== 'undefined') {
    window.addEventListener('resize', handleResize)
  }
})

onBeforeUnmount(() => {
  if (resizeObserver && tableContainer.value) {
    resizeObserver.unobserve(tableContainer.value)
  }
  resizeObserver = null
  if (typeof window !== 'undefined') {
    window.removeEventListener('resize', handleResize)
  }
})

defineExpose({ editarSelecionado, excluirSelecionado, visualizarSelecionado })
</script>
