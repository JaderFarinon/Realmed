<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar paciente (nome, CPF, email, cidade)..."
        class="w-full max-w-md rounded border px-3 py-2 text-sm"
      />
    </div>
    <div ref="tableContainer" class="custom-scrollbar flex-1 min-h-0 max-w-full overflow-auto">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nome</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">CPF</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Nascimento</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Contatos</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Cidade / UF</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">E-mail</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="text-theme-xs font-medium text-gray-500 dark:text-gray-400">Situação</p>
            </th>
            <th class="px-5 py-3 text-right sm:px-6 w-12">
              <span class="sr-only">Origem</span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <tr
            v-for="item in currentPagePacientes"
            :key="itemKey(item)"
            @click="selecionar(item)"
            :class="[
              'cursor-pointer border-t border-gray-100 dark:border-gray-800',
              { 'bg-gray-100 dark:bg-gray-800': selecionadoKey === itemKey(item) },
            ]"
            data-row="paciente"
          >
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">
                {{ item.nome_completo || '—' }}
              </p>
              <p v-if="item.nome_social" class="text-xs text-gray-400 dark:text-gray-500">
                Nome social: {{ item.nome_social }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ formatarCpf(item.cpf) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ formatarData(item.data_nascimento) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ formatarContatos(item) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="text-theme-sm text-gray-500 dark:text-gray-400">{{ formatarCidade(item) }}</p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <p class="truncate text-theme-sm text-gray-500 dark:text-gray-400">
                {{ item.email || '—' }}
              </p>
            </td>
            <td class="px-5 py-4 sm:px-6">
              <span
                class="rounded-full px-3 py-1 text-xs font-medium"
                :class="item.ie_status === true
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400'
                  : item.ie_status === false
                  ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400'
                  : 'bg-gray-100 text-gray-500 dark:bg-gray-700/60 dark:text-gray-300'"
              >
                {{ formatarStatus(item.ie_status) }}
              </span>
            </td>
            <td class="px-5 py-4 text-right sm:px-6">
              <DatabaseIcon
                v-if="item.origem === ORIGEM_INTEGRACAO"
                class="inline-block h-4 w-4 text-gray-300"
              />
            </td>
          </tr>
          <tr v-if="currentPagePacientes.length === 0">
            <td colspan="7" class="px-5 py-4 text-center text-gray-500 sm:px-6">Nenhum paciente encontrado</td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="flex items-center justify-between border-t border-gray-100 p-4 dark:border-gray-800">
      <div></div>
      <div class="flex gap-1">
        <template v-for="page in visiblePages" :key="`${page}-${currentPage}`">
          <button
            v-if="page === 'prev' || page === 'next'"
            class="rounded bg-gray-100 px-3 py-1 text-sm text-gray-500 hover:bg-gray-200"
            type="button"
            @click="goToPage(page)"
          >
            ...
          </button>
          <button
            v-else
            class="rounded px-3 py-1 text-sm"
            :class="{
              'bg-gray-900 text-white': page === currentPage,
              'bg-gray-100 text-gray-700 hover:bg-gray-200': page !== currentPage,
            }"
            type="button"
            @click="goToPage(page as number)"
          >
            {{ (page as number) + 1 }}
          </button>
        </template>
        <button
          class="rounded bg-gray-100 px-2 py-1 text-gray-700"
          :class="{ 'cursor-not-allowed opacity-50': currentPage === 0 }"
          aria-label="Página anterior"
          type="button"
          @click="currentPage > 0 && (currentPage = currentPage - 1)"
          :disabled="currentPage === 0"
        >
          &lt;
        </button>
        <button
          class="rounded bg-gray-100 px-2 py-1 text-gray-700"
          :class="{ 'cursor-not-allowed opacity-50': currentPage === numPages - 1 }"
          aria-label="Próxima página"
          type="button"
          @click="currentPage < numPages - 1 && (currentPage = currentPage + 1)"
          :disabled="currentPage === numPages - 1"
        >
          &gt;
        </button>
      </div>
      <div class="text-sm text-gray-500">Página {{ currentPageHuman }} de {{ numPages }}</div>
    </div>
    <PacienteModal
      :isOpen="modalVisivel"
      :dados="pacienteSelecionado"
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
import PacienteModal from '@/components/forms/pacientes/PacienteModal.vue'
import { useToast, type ToastType } from '@/composables/useToast'
import { DatabaseIcon } from '@/icons'
import {
  buscarPacientesIntegrados,
  ORIGEM_INTEGRACAO,
  type PacienteIntegrado,
  type PacienteOrigem,
} from '@/services/pacientes'

type Paciente = PacienteIntegrado
type ItemOrigem = PacienteOrigem

interface PacienteFormPayload {
  id?: number | string | null
  nome_completo?: string
  nome_social?: string
  data_nascimento?: string
  sexo?: string
  cpf?: string
  telefone_principal?: string
  telefone_celular?: string
  email?: string
  endereco_logradouro?: string
  endereco_cidade?: string
  endereco_uf?: string
  endereco_cep?: string
  nome_mae?: string
  nome_pai?: string
  estado_civil?: string
  profissao?: string
  ie_status?: boolean
}

const props = defineProps<{ atualizar: boolean }>()

const emit = defineEmits<{
  (e: 'selecionado-change', payload: { item: Paciente | null; origem: ItemOrigem | null }): void
}>()

const pacientes = ref<Paciente[]>([])
const filtro = ref('')
const perPage = ref(5)
const currentPage = ref(0)
const modalVisivel = ref(false)
const pacienteSelecionado = ref<PacienteFormPayload | null>(null)
const somenteVisualizacao = ref(false)
const selecionado = ref<Paciente | null>(null)
const ultimaChaveSelecionada = ref<string | null>(null)
const toast = useToast()

const tableContainer = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const sanitizeDigits = (value: unknown): string => {
  if (value === null || value === undefined) return ''
  return String(value).replace(/\D/g, '')
}

const prepararDadosParaModal = (paciente: Paciente): PacienteFormPayload => ({
  id: paciente.id,
  nome_completo: paciente.nome_completo,
  nome_social: paciente.nome_social ?? undefined,
  data_nascimento: paciente.data_nascimento ?? undefined,
  sexo: paciente.sexo ?? undefined,
  cpf: paciente.cpf ?? undefined,
  telefone_principal: paciente.telefone_principal ?? undefined,
  telefone_celular: paciente.telefone_celular ?? undefined,
  email: paciente.email ?? undefined,
  endereco_logradouro: paciente.endereco_logradouro ?? undefined,
  endereco_cidade: paciente.endereco_cidade ?? undefined,
  endereco_uf: paciente.endereco_uf ?? undefined,
  endereco_cep: paciente.endereco_cep ?? undefined,
  nome_mae: paciente.nome_mae ?? undefined,
  nome_pai: paciente.nome_pai ?? undefined,
  estado_civil: paciente.estado_civil ?? undefined,
  profissao: paciente.profissao ?? undefined,
  ie_status: paciente.ie_status ?? undefined,
})

const itemKey = (paciente: Paciente) => `${paciente.origem}-${String(paciente.id)}`
const selecionadoKey = computed(() => (selecionado.value ? itemKey(selecionado.value) : null))

const atualizarLinhasPorPagina = () => {
  const container = tableContainer.value
  if (!container) return

  const tabela = container.querySelector('table')
  const cabecalho = tabela?.querySelector('thead') as HTMLElement | null
  const primeiraLinha = tabela?.querySelector('tbody tr[data-row="paciente"]') as HTMLTableRowElement | null
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

const selecionar = (item: Paciente) => {
  selecionado.value = item
}

const isIntegracao = (item: Paciente | null) => item?.origem === ORIGEM_INTEGRACAO

watch(selecionado, (novo) => {
  ultimaChaveSelecionada.value = novo ? itemKey(novo) : null
  emit('selecionado-change', { item: novo, origem: novo?.origem ?? null })
})

const pacientesFiltrados = computed(() => {
  let lista = pacientes.value.slice()
  if (filtro.value) {
    const termo = filtro.value.toLowerCase()
    lista = lista.filter((paciente) => {
      const nome = paciente.nome_completo ?? ''
      const cpf = paciente.cpf ?? ''
      const email = paciente.email ?? ''
      const cidade = paciente.endereco_cidade ?? ''
      const telefone = paciente.telefone_principal ?? ''
      const celular = paciente.telefone_celular ?? ''
      return [nome, cpf, email, cidade, telefone, celular].some((campo) => campo.toLowerCase().includes(termo))
    })
  }
  return lista.sort((a, b) => (a.nome_completo || '').localeCompare(b.nome_completo || '', 'pt-BR'))
})

const numPages = computed(() => {
  const pages = Math.ceil(pacientesFiltrados.value.length / perPage.value)
  return pages > 0 ? pages : 1
})

const currentPagePacientes = computed(() =>
  pacientesFiltrados.value.slice(perPage.value * currentPage.value, perPage.value * (currentPage.value + 1)),
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

const formatarCpf = (valor: string | null | undefined) => {
  if (!valor) return '—'
  const digits = sanitizeDigits(valor)
  if (digits.length !== 11) return valor
  return digits.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const formatarTelefone = (valor: string | null | undefined) => {
  if (!valor) return ''
  const digits = sanitizeDigits(valor)
  if (digits.length === 11) return digits.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
  if (digits.length === 10) return digits.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
  return valor
}

const formatarContatos = (paciente: Paciente) => {
  const contatos = [paciente.telefone_principal, paciente.telefone_celular, paciente.telefone_comercial]
    .map((telefone) => formatarTelefone(telefone))
    .filter((telefone, index, lista) => telefone && lista.indexOf(telefone) === index)
  return contatos.length ? contatos.join(' | ') : '—'
}

const formatarCidade = (paciente: Paciente) => {
  const cidade = paciente.endereco_cidade || ''
  const uf = paciente.endereco_uf || ''
  if (cidade && uf) return `${cidade} / ${uf}`
  if (cidade) return cidade
  if (uf) return uf
  return '—'
}

const formatarData = (valor: string | null | undefined) => {
  if (!valor) return '—'
  const date = new Date(valor)
  if (Number.isNaN(date.getTime())) {
    return valor.length >= 10 ? valor.slice(0, 10).split('-').reverse().join('/') : valor
  }
  return new Intl.DateTimeFormat('pt-BR').format(date)
}

const formatarStatus = (valor: boolean | null | undefined) => {
  if (valor === true) return 'Ativo'
  if (valor === false) return 'Inativo'
  return '—'
}

const carregarPacientes = async () => {
  const chaveAnterior = ultimaChaveSelecionada.value
  try {
    const dados = await buscarPacientesIntegrados()
    pacientes.value = dados.map((item) => ({ ...item }))

    const selecionadoAtualizado = chaveAnterior
      ? pacientes.value.find((paciente) => itemKey(paciente) === chaveAnterior) ?? null
      : null
    selecionado.value = selecionadoAtualizado

    await nextTick()
    atualizarLinhasPorPagina()
    if (currentPage.value > numPages.value - 1) {
      currentPage.value = numPages.value - 1
    }
  } catch (err: unknown) {
    const error = err as { response?: { data?: { mensagem?: string } } }
    toast.error(
      'Erro ao buscar pacientes' + (error.response?.data?.mensagem ? `: ${error.response.data.mensagem}` : ''),
    )
    pacientes.value = []
    selecionado.value = null
  }
}

const editarSelecionado = () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  somenteVisualizacao.value = false
  pacienteSelecionado.value = prepararDadosParaModal(selecionado.value)
  modalVisivel.value = true
}

const visualizarSelecionado = () => {
  if (!selecionado.value) return
  somenteVisualizacao.value = true
  pacienteSelecionado.value = prepararDadosParaModal(selecionado.value)
  modalVisivel.value = true
}

const excluir = async (id: number | string) => {
  if (!confirm('Confirma a exclusão do paciente?')) return
  try {
    await api.delete(`/pacientes/${id}`)
    toast.success('Paciente excluído com sucesso')
    carregarPacientes()
  } catch (err: unknown) {
    const error = err as { response?: { data?: { mensagem?: string } } }
    toast.error('Erro ao excluir paciente' + (error.response?.data?.mensagem ? `: ${error.response.data.mensagem}` : ''))
  }
}

const excluirSelecionado = async () => {
  if (!selecionado.value || isIntegracao(selecionado.value)) return
  await excluir(selecionado.value.id)
}

const fecharModal = (precisaAtualizar: boolean) => {
  modalVisivel.value = false
  pacienteSelecionado.value = null
  somenteVisualizacao.value = false
  if (precisaAtualizar) carregarPacientes()
}

const handleNotificacao = (notificacao: { tipo: ToastType; mensagem: string }) => {
  if (notificacao.tipo === 'success') {
    toast.success(notificacao.mensagem)
  } else if (notificacao.tipo === 'error') {
    toast.error(notificacao.mensagem)
  } else {
    toast.info(notificacao.mensagem)
  }
}

watch(() => props.atualizar, () => carregarPacientes())

watch(pacientesFiltrados, () => {
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
  carregarPacientes()
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
