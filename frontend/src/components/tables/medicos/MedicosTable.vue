<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar médico (nome, conselho, CRM, CPF, telefone, e-mail, corpo clínico)..."
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
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Conselho</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Número do Conselho</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Corpo Clínico</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">CPF</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">Celular</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">E-mail</p>
            </th>
            <th class="px-5 py-3 text-right sm:px-6 w-12">
              <span class="sr-only">Origem</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in currentPageMedicos"
            :key="itemKey(item)"
            @click="selecionar(item)"
            :class="[
              'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
              { 'bg-gray-100 dark:bg-gray-800': selecionadoKey === itemKey(item) },
            ]"
            data-row="medico"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.nome_completo }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.conselho || '-' }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.crm_numero || '-' }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.corpo_clinico || '-' }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.cpf || '-' }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.telefone_principal || '-' }}</p>
            </td>
            <td class="px-5 py-1 sm:px-6">
              <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.email || '-' }}</p>
            </td>
            <td class="px-5 py-1 text-right sm:px-6">
              <DatabaseIcon
                v-if="item.origem === 'integracao'"
                class="inline-block h-4 w-4 text-gray-300"
              />
            </td>
          </tr>
          <tr v-if="currentPageMedicos.length === 0">
            <td colspan="7" class="px-5 py-4 text-center text-gray-500 sm:px-6">
              Nenhum médico encontrado
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
    <MedicoModal
      :isOpen="modalVisivel"
      :dados="medicoSelecionado"
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

import MedicoModal from '@/components/forms/medicos/MedicoModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'
import { DatabaseIcon } from '@/icons'
import {
  buscarMedicosIntegrados,
  type MedicoIntegrado,
  type MedicoOrigem,
} from '@/services/medicos'

type ItemOrigem = MedicoOrigem

interface Medico {
  id: number | string
  nome_completo: string
  conselho: string
  crm_numero: string
  crm_numero_original?: string | null
  crm_numero_correcao?: string | null
  crm_uf?: string | null
  corpo_clinico?: string | null
  cpf?: string | null
  telefone_principal?: string | null
  email?: string | null
  especialidade?: string | null
  ie_status: number | boolean
  origem: ItemOrigem
}

const props = defineProps<{ atualizar: boolean }>()

const emit = defineEmits<{
  (e: 'selecionado-change', payload: { item: Medico | null; origem: ItemOrigem | null }): void
}>()

const medicos = ref<Medico[]>([])
const filtro = ref('')
const perPage = ref(5)
const currentPage = ref(0)
const modalVisivel = ref(false)
const medicoSelecionado = ref<Medico | null>(null)
const somenteVisualizacao = ref(false)
const selecionado = ref<Medico | null>(null)
const ultimaChaveSelecionada = ref<string | null>(null)
const toast = useToast()

const tableContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const itemKey = (item: Medico) => `${item.origem}-${String(item.id)}`
const selecionadoKey = computed(() => (selecionado.value ? itemKey(selecionado.value) : null))

const isIntegracao = (item: Medico | null) => item?.origem === 'integracao'

const atualizarLinhasPorPagina = () => {
  const container = tableContainer.value
  if (!container) return

  const tabela = container.querySelector('table')
  const cabecalho = tabela?.querySelector('thead') as HTMLElement | null
  const primeiraLinha = tabela?.querySelector('tbody tr[data-row="medico"]') as HTMLTableRowElement | null
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

const selecionar = (item: Medico) => {
  selecionado.value = item
}

watch(selecionado, (novo) => {
  ultimaChaveSelecionada.value = novo ? itemKey(novo) : null
  emit('selecionado-change', { item: novo, origem: novo?.origem ?? null })
})

const transformarMedicoIntegrado = (medico: MedicoIntegrado): Medico => ({
  id: medico.id,
  nome_completo: medico.nome_completo,
  conselho: medico.conselho,
  crm_numero: medico.crm_numero,
  crm_numero_original: medico.crm_numero_original,
  crm_numero_correcao: medico.crm_numero_correcao,
  crm_uf: medico.crm_uf,
  corpo_clinico: medico.corpo_clinico,
  cpf: medico.cpf,
  telefone_principal: medico.telefone_principal,
  email: medico.email,
  especialidade: medico.especialidade,
  ie_status: medico.ie_status,
  origem: medico.origem,
})

const medicosFiltrados = computed(() => {
  let lista = medicos.value.slice()
  if (filtro.value) {
    const f = filtro.value.toLowerCase()
    lista = lista.filter((p) =>
      (p.nome_completo || '').toLowerCase().includes(f) ||
      (p.conselho || '').toLowerCase().includes(f) ||
      (p.crm_numero || '').toLowerCase().includes(f) ||
      (p.crm_numero_original || '').toLowerCase().includes(f) ||
      (p.corpo_clinico || '').toLowerCase().includes(f) ||
      (p.cpf || '').toLowerCase().includes(f) ||
      (p.telefone_principal || '').toLowerCase().includes(f) ||
      (p.email || '').toLowerCase().includes(f)
    )
  }
  return lista.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'))
})

const numPages = computed(() => {
  const pages = Math.ceil(medicosFiltrados.value.length / perPage.value)
  return pages > 0 ? pages : 1
})

const currentPageMedicos = computed(() =>
  medicosFiltrados.value.slice(
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

const carregarMedicos = async () => {
  const chaveAnterior = ultimaChaveSelecionada.value
  try {
    const dados = await buscarMedicosIntegrados()
    medicos.value = dados.map((item) => transformarMedicoIntegrado(item))

    const selecionadoAtualizado = chaveAnterior
      ? medicos.value.find((item) => itemKey(item) === chaveAnterior) ?? null
      : null
    selecionado.value = selecionadoAtualizado

    await nextTick()
    atualizarLinhasPorPagina()
    if (currentPage.value > numPages.value - 1) currentPage.value = numPages.value - 1
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao buscar Médicos' + (e.response?.data?.mensagem ? `: ${e.response.data.mensagem}` : ''))
    medicos.value = []
    selecionado.value = null
  }
}

const editarSelecionado = () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  somenteVisualizacao.value = false
  medicoSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const visualizarSelecionado = () => {
  if (!selecionado.value) return
  somenteVisualizacao.value = true
  medicoSelecionado.value = selecionado.value
  modalVisivel.value = true
}

const excluir = async (id: number | string) => {
  if (!confirm('Confirma a exclusão do Médico?')) return
  try {
    await api.delete(`/medicos/${id}`)
    toast.success('Médico excluído com sucesso')
    carregarMedicos()
  } catch (err: unknown) {
    const e = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao excluir Médico: ' + (e.response?.data?.mensagem || ''))
  }
}

const excluirSelecionado = async () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  await excluir(selecionado.value.id)
}

const fecharModal = (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  medicoSelecionado.value = null
  somenteVisualizacao.value = false
  if (precisaAtualizar) carregarMedicos()
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

watch(() => props.atualizar, () => carregarMedicos())
watch(medicosFiltrados, () => {
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
  carregarMedicos()
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
