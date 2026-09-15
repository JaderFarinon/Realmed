<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar procedimento (nome, código, especialidade, porte, unidade)..."
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
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Código</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Especialidade</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Valor</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Porte</p>
            </th>
            <th class="px-5 py-3 text-right sm:px-6 w-12">
              <span class="sr-only">Origem</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in currentPageProcedimentos"
            :key="itemKey(item)"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionadoKey === itemKey(item) },
            ]"
            data-row="procedimento"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.nome }}</p>
              <p class="text-xs text-gray-400" v-if="item.unidade">Unidade: {{ item.unidade }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.codigo_tuss }}</p>
              <p class="text-xs text-gray-400" v-if="item.codigo_clinic">Clinic: {{ item.codigo_clinic }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.especialidade }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ formatCurrency(item.valor) }}</p>
              <p class="text-xs text-gray-400" v-if="item.percentual !== null">{{ item.percentual }}%</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.porte }}</p>
              <p class="text-xs text-gray-400" v-if="item.modalidade_wtt">{{ item.modalidade_wtt }}</p>
            </td>
            <td class="px-5 py-1 text-right sm:px-6">
              <DatabaseIcon
                v-if="item.origem === 'integracao'"
                class="inline-block h-4 w-4 text-gray-300"
              />
            </td>
          </tr>
          <tr v-if="currentPageProcedimentos.length === 0">
            <td colspan="5" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum procedimento encontrado
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800">
      <div></div>
      <div class="flex gap-1">
        <template v-for="page in visiblePages" :key="page + '-' + currentPage">
          <button
            v-if="page === 'prev' || page === 'next'"
            class="px-3 py-1 text-sm text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
            @click="goToPage(page)"
            type="button"
          >
            ...
          </button>
          <button
            v-else
            class="px-3 py-1 text-sm rounded"
            :class="{
              'bg-gray-900 text-white': page === currentPage,
              'bg-gray-100 text-gray-700 hover:bg-gray-200': page !== currentPage,
            }"
            @click="goToPage(page)"
            type="button"
          >
            {{ (page as number) + 1 }}
          </button>
        </template>
        <button
          class="px-2 py-1 text-gray-700 bg-gray-100 rounded"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === 0 }"
          @click="currentPage > 0 && (currentPage = currentPage - 1)"
          :disabled="currentPage === 0"
          aria-label="Página anterior"
        >
          &lt;
        </button>
        <button
          class="px-2 py-1 text-gray-700 bg-gray-100 rounded"
          :class="{ 'opacity-50 cursor-not-allowed': currentPage === numPages - 1 }"
          @click="currentPage < numPages - 1 && (currentPage = currentPage + 1)"
          :disabled="currentPage === numPages - 1"
          aria-label="Próxima página"
        >
          &gt;
        </button>
      </div>
      <div class="text-sm text-gray-500">Página {{ currentPageHuman }} de {{ numPages }}</div>
    </div>
    <ProcedimentoModal
      :isOpen="modalVisivel"
      :dados="procedimentoSelecionado"
      :somenteLeitura="somenteVisualizacao"
      @close="fecharModal"
      @sucesso="handleNotificacao"
      @erro="handleNotificacao"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick, defineExpose, defineEmits } from 'vue'
import api from '@/plugins/axios'

import ProcedimentoModal from '@/components/forms/procedimentos/ProcedimentoModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'
import { DatabaseIcon } from '@/icons'

type ItemOrigem = 'local' | 'integracao'

interface Procedimento {
  id?: number | string
  nome: string
  codigo_tuss: string | null
  codigo_clinic: string | null
  descricao: string | null
  orientacoes: string | null
  tipo: string | null
  grupo: string | null
  tempo_estimado: number | null
  ativo: boolean
  percentual: number | null
  porte: string | null
  valor: number | null
  custo_operacional: number | null
  numero_auxiliares: number | null
  portes_anestesicos: number | null
  filmes: number | null
  incidencia: string | null
  unidade: string | null
  exibir: boolean
  especialidade: string | null
  exibir_inter: boolean
  destacar: boolean
  modalidade_wtt: string | null
  origem: ItemOrigem
}

const props = defineProps<{ atualizar: boolean }>()

const emit = defineEmits<{
  (e: 'selecionado-change', payload: { item: Procedimento | null; origem: ItemOrigem | null }): void
}>()

const procedimentos = ref<Procedimento[]>([])
const filtro = ref('')
const perPage = ref(5)
const currentPage = ref(0)
const modalVisivel = ref(false)
const procedimentoSelecionado = ref<Procedimento | null>(null)
const somenteVisualizacao = ref(false)
const selecionado = ref<Procedimento | null>(null)
const ultimaChaveSelecionada = ref<string | null>(null)
const toast = useToast()

const tableContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const formatCurrency = (valor: number | null) => {
  if (valor === null || valor === undefined) return '-'
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor)
}

const normalizaBoolean = (valor: unknown, defaultValue: boolean) => {
  if (valor === undefined || valor === null || valor === '') return defaultValue
  if (typeof valor === 'boolean') return valor
  if (typeof valor === 'number') return valor === 1
  if (typeof valor === 'string') {
    const normalized = valor.trim().toLowerCase()
    if (['1', 'true', 't', 'y', 'yes', 's', 'sim'].includes(normalized)) return true
    if (['0', 'false', 'f', 'n', 'no', 'nao', 'não'].includes(normalized)) return false
  }
  return Boolean(valor)
}

const normalizaNumero = (valor: unknown) => {
  if (valor === undefined || valor === null || valor === '') return null
  const numero = Number(valor)
  return Number.isFinite(numero) ? numero : null
}

const resolveOrigem = (valor: unknown): ItemOrigem => {
  if (typeof valor === 'string') {
    const normalized = valor
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
    if (['integracao', 'integracao_clinic', 'clinic', 'externo', 'external'].includes(normalized)) {
      return 'integracao'
    }
  }
  return 'local'
}

const normalizarProcedimento = (item: Partial<Procedimento>) => {
  const base = item as Record<string, unknown>
  const rawId = item.id ?? item.codigo_tuss ?? item.codigo_clinic ?? item.nome ?? null
  const id =
    typeof rawId === 'number' || typeof rawId === 'string'
      ? rawId
      : rawId !== null
      ? String(rawId)
      : undefined

  return {
    id,
    nome: item.nome ?? '',
    codigo_tuss: item.codigo_tuss ?? null,
    codigo_clinic: item.codigo_clinic ?? null,
    descricao: item.descricao ?? null,
    orientacoes: item.orientacoes ?? null,
    tipo: item.tipo ?? null,
    grupo: item.grupo ?? null,
    tempo_estimado: normalizaNumero(item.tempo_estimado),
    ativo: normalizaBoolean(item.ativo, true),
    percentual: normalizaNumero(item.percentual),
    porte: item.porte ?? null,
    valor: normalizaNumero(item.valor),
    custo_operacional: normalizaNumero(item.custo_operacional),
    numero_auxiliares: normalizaNumero(item.numero_auxiliares),
    portes_anestesicos: normalizaNumero(item.portes_anestesicos),
    filmes: normalizaNumero(item.filmes),
    incidencia: item.incidencia ?? null,
    unidade: item.unidade ?? null,
    exibir: normalizaBoolean(item.exibir, true),
    especialidade: item.especialidade ?? null,
    exibir_inter: normalizaBoolean(item.exibir_inter, false),
    destacar: normalizaBoolean(item.destacar, false),
    modalidade_wtt: item.modalidade_wtt ?? null,
    origem: resolveOrigem(base.origem),
  }
}

const atualizarLinhasPorPagina = () => {
  const container = tableContainer.value
  if (!container) return

  const tabela = container.querySelector('table')
  const cabecalho = tabela?.querySelector('thead') as HTMLElement | null
  const primeiraLinha = tabela?.querySelector('tbody tr[data-row="procedimento"]') as HTMLTableRowElement | null
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

const selecionar = (item: Procedimento) => {
  selecionado.value = item
}

const itemKey = (item: Procedimento) => `${item.origem}-${item.id ?? item.codigo_tuss ?? item.nome}`
const selecionadoKey = computed(() => (selecionado.value ? itemKey(selecionado.value) : null))
const isIntegracao = (item: Procedimento | null) => item?.origem === 'integracao'

watch(selecionado, (novo) => {
  ultimaChaveSelecionada.value = novo ? itemKey(novo) : null
  emit('selecionado-change', { item: novo, origem: novo?.origem ?? null })
})

const procedimentosFiltrados = computed(() => {
  const termo = filtro.value.trim().toLowerCase()
  let lista = procedimentos.value.slice()

  if (termo) {
    lista = lista.filter((p) =>
      (p.nome || '').toLowerCase().includes(termo) ||
      (p.codigo_tuss || '').toLowerCase().includes(termo) ||
      (p.codigo_clinic || '').toLowerCase().includes(termo) ||
      (p.especialidade || '').toLowerCase().includes(termo) ||
      (p.porte || '').toLowerCase().includes(termo) ||
      (p.modalidade_wtt || '').toLowerCase().includes(termo) ||
      (p.unidade || '').toLowerCase().includes(termo)
    )
  }

  return lista.sort((a, b) => (a.nome || '').localeCompare(b.nome || '', 'pt-BR'))
})

const numPages = computed(() => {
  const pages = Math.ceil(procedimentosFiltrados.value.length / perPage.value)
  return pages > 0 ? pages : 1
})

const currentPageProcedimentos = computed(() =>
  procedimentosFiltrados.value.slice(
    perPage.value * currentPage.value,
    perPage.value * (currentPage.value + 1)
  )
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

const carregarProcedimentos = async () => {
  const chaveAnterior = ultimaChaveSelecionada.value
  try {
    const response = await api.get('/procedimentos')
    procedimentos.value = Array.isArray(response.data)
      ? response.data.map((item: Partial<Procedimento>) => normalizarProcedimento(item))
      : []

    const selecionadoAtualizado = chaveAnterior
      ? procedimentos.value.find((item) => itemKey(item) === chaveAnterior) ?? null
      : null
    selecionado.value = selecionadoAtualizado

    await nextTick()
    atualizarLinhasPorPagina()
    if (currentPage.value > numPages.value - 1) currentPage.value = numPages.value - 1
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao buscar Procedimentos' + (e.response?.data?.mensagem || ''))
    procedimentos.value = []
    selecionado.value = null
  }
}

const editarSelecionado = () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  somenteVisualizacao.value = false
  procedimentoSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const visualizarSelecionado = () => {
  if (!selecionado.value) return
  somenteVisualizacao.value = true
  procedimentoSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const excluir = async (id?: number | string) => {
  if (id === undefined || id === null) return
  if (!confirm('Confirma a exclusão do Procedimento?')) return
  try {
    await api.delete(`/procedimentos/${id}`)
    toast.success('Procedimento excluído com sucesso')
    carregarProcedimentos()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao excluir Procedimento: ' + (e.response?.data?.mensagem || ''))
  }
}

const excluirSelecionado = async () => {
  if (!selecionado.value || isIntegracao(selecionado.value) || selecionado.value.id === undefined) return
  await excluir(selecionado.value.id)
}

const fecharModal = (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  procedimentoSelecionado.value = null
  somenteVisualizacao.value = false
  if (precisaAtualizar) carregarProcedimentos()
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

watch(
  () => props.atualizar,
  () => carregarProcedimentos()
)

watch(procedimentosFiltrados, () => {
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
  carregarProcedimentos()
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

defineExpose({ editarSelecionado, excluirSelecionado, visualizarSelecionado, carregarProcedimentos })
</script>
