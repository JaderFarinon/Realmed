<template>
  <div
    class="flex flex-col flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="p-4">
      <input
        v-model="filtro"
        type="text"
        placeholder="Buscar solicitação (id, n°, paciente, procedimento, data, médico, status)..."
        class="w-full max-w-md px-3 py-2 text-sm border rounded"
      />
    </div>
    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700">
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">ID</p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                N° Liberação
              </p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Paciente
              </p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Procedimento
              </p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Data
              </p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Médico
              </p>
            </th>
            <th class="px-5 py-3 text-left sm:px-6">
              <p class="font-medium text-gray-500 text-theme-xs dark:text-gray-400">
                Status
              </p>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
          <template v-if="carregando">
            <tr>
              <td colspan="7" class="px-5 py-4 text-center text-gray-500 sm:px-6">
                Carregando solicitações...
              </td>
            </tr>
          </template>
          <template v-else-if="erroCarregamento">
            <tr>
              <td colspan="7" class="px-5 py-4 text-center text-gray-500 sm:px-6">
                {{ erroCarregamento }}
              </td>
            </tr>
          </template>
          <template v-else>
            <tr
              v-for="item in currentPageRequests"
              :key="item.id"
              @click="selecionar(item)"
              @dblclick="editar(item)"
              :class="[
                'border-t border-gray-100 dark:border-gray-800 cursor-pointer',
                { 'bg-gray-100 dark:bg-gray-800': selecionado?.id === item.id },
              ]"
            >
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.id }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.numero }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.paciente }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.procedimento }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.data }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <p class="text-gray-500 text-theme-sm dark:text-gray-400">{{ item.medico }}</p>
              </td>
              <td class="px-5 py-4 sm:px-6">
                <span
                  :class="[
                    'rounded-full px-2 py-0.5 text-theme-xs font-medium',
                    badgeClassForStatus(item.status),
                  ]"
                >
                  {{ item.status }}
                </span>
              </td>
            </tr>
            <tr v-if="currentPageRequests.length === 0">
              <td colspan="7" class="px-5 py-4 text-center text-gray-500 sm:px-6">
                Nenhuma solicitação encontrada
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
    <div
      class="flex items-center justify-between p-4 border-t border-gray-100 dark:border-gray-800"
    >
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
      <div class="text-sm text-gray-500">
        Página {{ currentPageHuman }} de {{ numPages }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, defineExpose, onMounted } from 'vue'
import api from '@/plugins/axios'

interface SurgicalRequest {
  id: string
  numero: string
  paciente: string
  procedimento: string
  data: string
  medico: string
  status: string
  raw: Record<string, unknown>
}

const emit = defineEmits<{
  (e: 'editar', dados: Record<string, unknown>): void
  (e: 'cancelar', dados: Record<string, unknown>): void
  (e: 'selecionado', dados: Record<string, unknown> | null): void
}>()

const requests = ref<SurgicalRequest[]>([])
const carregando = ref(false)
const erroCarregamento = ref('')

const STATUS_LABEL_OVERRIDES: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  AGENDADA: 'Agendada',
  CANCELADA: 'Cancelada',
  CONCLUIDO: 'Concluída',
  CONCLUIDA: 'Concluída',
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  Pendente:
    'bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-400',
  'Em Andamento':
    'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  Cancelada: 'bg-red-50 text-red-700 dark:bg-red-500/20 dark:text-red-300',
  'Concluída':
    'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
  Agendada: 'bg-sky-50 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300',
  Aprovada:
    'bg-success-50 text-success-700 dark:bg-success-500/15 dark:text-success-500',
}

const filtro = ref('')
const perPage = ref(8)
const currentPage = ref(0)
const selecionado = ref<SurgicalRequest | null>(null)

const selecionar = (item: SurgicalRequest) => {
  selecionado.value = item
  emit('selecionado', item.raw)
}

const paraTitulo = (value: string) =>
  value
    .replace(/[_\s]+/g, ' ')
    .trim()
    .toLowerCase()
    .split(' ')
    .filter((parte) => parte.length)
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ')

const normalizarStatusChave = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toUpperCase()
    .replace(/[\s-]+/g, '_')

const normalizarStatus = (valor: unknown) => {
  if (typeof valor === 'string' && valor.trim().length > 0) {
    const chave = normalizarStatusChave(valor)
    if (STATUS_LABEL_OVERRIDES[chave]) {
      return STATUS_LABEL_OVERRIDES[chave]
    }
    return paraTitulo(valor)
  }
  return 'Pendente'
}

const badgeClassForStatus = (status: string) =>
  STATUS_BADGE_CLASSES[status] ||
  'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'

const normalizarTexto = (valor: unknown, padrao = '') => {
  if (valor === null || valor === undefined) {
    return padrao
  }
  if (typeof valor === 'string') {
    return valor.trim() || padrao
  }
  if (typeof valor === 'number' || typeof valor === 'boolean') {
    return String(valor)
  }
  return padrao
}

const formatarData = (valor: unknown) => {
  const texto = normalizarTexto(valor)
  if (!texto) {
    return ''
  }

  if (/^\d{2}\/\d{2}\/\d{4}$/.test(texto)) {
    return texto
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) {
    const [ano, mes, dia] = texto.split('-')
    return `${dia}/${mes}/${ano}`
  }

  const data = new Date(texto)
  if (Number.isNaN(data.getTime())) {
    return texto
  }

  return data.toLocaleDateString('pt-BR')
}

const extrairPrimeiroProcedimento = (valor: unknown) => {
  if (Array.isArray(valor)) {
    const primeiro = valor[0]
    if (primeiro && typeof primeiro === 'object') {
      const registro = primeiro as Record<string, unknown>
      return (
        normalizarTexto(registro.nome) ||
        normalizarTexto(registro.descricao) ||
        normalizarTexto(registro.procedimento_nome)
      )
    }
  }
  return ''
}

const normalizarSolicitacao = (entrada: unknown, indice: number): SurgicalRequest => {
  const registro = (entrada && typeof entrada === 'object'
    ? (entrada as Record<string, unknown>)
    : {}) as Record<string, unknown>

  const id =
    normalizarTexto(
      registro.id ??
        registro.esteira_procedimento_id ??
        registro.solicitacao_id ??
        registro.numero ??
        registro.codigo,
    ) || `${indice + 1}`

  const numero =
    normalizarTexto(
      registro.numero_liberacao ?? registro.numero ?? registro.codigo ?? registro.id,
    ) || `#${indice + 1}`

  const paciente =
    normalizarTexto(
      registro.nome_paciente ?? registro.paciente ?? registro.patient ?? registro.patient_name,
      'Não informado',
    )

  const procedimento =
    extrairPrimeiroProcedimento(registro.procedimentos) ||
    normalizarTexto(
      registro.procedimento ??
        registro.procedimento_nome ??
        registro.procedimento_principal ??
        registro.descricao_procedimento,
      'Não informado',
    )

  const dataCirurgia =
    formatarData(
      registro.data_cirurgia ??
        registro.data_prevista ??
        registro.data ??
        registro.previsao ??
        registro.schedule_date,
    ) || '—'

  const medico =
    normalizarTexto(
      registro.medico ??
        registro.medico_responsavel ??
        registro.medico_nome ??
        registro.surgeon ??
        registro.doctor,
      'Não informado',
    )

  const status = normalizarStatus(
    registro.status ?? registro.solicitacao_status ?? registro.situacao ?? registro.stage,
  )

  return {
    id,
    numero,
    paciente,
    procedimento,
    data: dataCirurgia,
    medico,
    status,
    raw: registro,
  }
}

const carregarSolicitacoes = async () => {
  try {
    carregando.value = true
    erroCarregamento.value = ''
    const { data } = await api.get('/esteira-procedimentos')
    const lista = Array.isArray(data) ? data : []
    requests.value = lista.map((item, index) => normalizarSolicitacao(item, index))
    selecionado.value = null
    currentPage.value = 0
    emit('selecionado', null)
  } catch (error) {
    console.error('Erro ao carregar solicitações de cirurgia', error)
    erroCarregamento.value = 'Não foi possível carregar as solicitações.'
    requests.value = []
    selecionado.value = null
    currentPage.value = 0
    emit('selecionado', null)
  } finally {
    carregando.value = false
  }
}

const filteredRequests = computed(() => {
  if (!filtro.value) return requests.value
  const f = filtro.value.toLowerCase()
  return requests.value.filter((r) =>
    r.id.toLowerCase().includes(f) ||
    r.numero.toLowerCase().includes(f) ||
    r.paciente.toLowerCase().includes(f) ||
    r.procedimento.toLowerCase().includes(f) ||
    r.data.toLowerCase().includes(f) ||
    r.medico.toLowerCase().includes(f) ||
    r.status.toLowerCase().includes(f)
  )
})

const numPages = computed(() => {
  const pages = Math.ceil(filteredRequests.value.length / perPage.value)
  return pages > 0 ? pages : 1
})

const currentPageRequests = computed(() =>
  filteredRequests.value.slice(
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

const editar = (item: SurgicalRequest) => {
  emit('editar', item.raw)
}

const cancelar = (item: SurgicalRequest) => {
  emit('cancelar', item.raw)
}

const editarSelecionado = () => {
  if (selecionado.value) {
    editar(selecionado.value)
  }
}

const cancelarSelecionado = () => {
  if (selecionado.value) {
    cancelar(selecionado.value)
  }
}

watch(filtro, () => {
  currentPage.value = 0
})

watch(filteredRequests, (lista) => {
  const totalPaginas = Math.ceil(lista.length / perPage.value)
  if (totalPaginas === 0) {
    currentPage.value = 0
    return
  }
  if (currentPage.value > totalPaginas - 1) {
    currentPage.value = totalPaginas - 1
  }
})

onMounted(() => {
  void carregarSolicitacoes()
})

const getSelecionado = () => selecionado.value?.raw ?? null

defineExpose({
  editarSelecionado,
  cancelarSelecionado,
  reload: carregarSolicitacoes,
  getSelecionado,
})
</script>

<style scoped>
/* Additional styles if needed */
</style>
