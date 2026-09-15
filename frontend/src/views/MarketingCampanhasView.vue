<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="flex flex-col gap-6 min-h-[calc(100vh-180px)]">
        <PageBreadcrumb
          :pageTitle="pageTitle"
          :buttons="breadcrumbButtons"
          @novo="abrirModalCriacao"
        >
          <template #actions>
            <Button
              v-if="currentStep === 1"
              size="sm"
              variant="primary"
              :startIcon="SendIcon"
              :disabled="!podeExecutar"
              @click="executarCampanha"
            >
              Executar
            </Button>
          </template>
        </PageBreadcrumb>

        <p class="text-sm text-gray-500 dark:text-gray-400">
          Gerencie campanhas, selecione pacientes e envie comunicações por e-mail de forma integrada.
        </p>

        <CardBox v-if="currentStep === 1" class="flex flex-col flex-1">
          <div class="flex flex-col gap-4 flex-1">
            <div class="flex justify-end">
              <div class="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <span>Itens por página:</span>
                <select
                  v-model.number="perPage"
                  class="h-10 rounded-lg border border-gray-300 bg-transparent px-3 text-sm text-gray-700 shadow-theme-xs focus:border-brand-400 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/80 dark:focus:border-brand-800"
                >
                  <option v-for="option in perPageOptions" :key="option" :value="option">
                    {{ option }}
                  </option>
                </select>
              </div>
            </div>

            <div class="flex-1 overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead class="bg-gray-50 dark:bg-gray-800/60">
                  <tr>
                    <th class="w-16 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Seleção
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Nome
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Status
                    </th>
                    <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Criada em
                    </th>
                    <th class="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-if="carregandoCampanhas">
                    <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Carregando campanhas...
                    </td>
                  </tr>
                  <tr v-else-if="campanhasOrdenadas.length === 0">
                    <td colspan="5" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhuma campanha cadastrada até o momento.
                    </td>
                  </tr>
                  <tr
                    v-for="campanha in campanhasPaginadas"
                    v-else
                    :key="campanha.id"
                    :class="[
                      'cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/5',
                      selecionadaId === campanha.id ? 'bg-brand-500/5 dark:bg-brand-500/10' : '',
                    ]"
                    @click="selecionarCampanha(campanha.id)"
                  >
                    <td class="px-4 py-3">
                      <input
                        type="radio"
                        class="h-4 w-4 text-brand-500 focus:ring-brand-500"
                        :checked="selecionadaId === campanha.id"
                        @change.stop="selecionarCampanha(campanha.id)"
                      />
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                      {{ campanha.nome }}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <span :class="badgeClasse(campanha.status)" class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                        {{ statusLabel(campanha.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                      {{ formatarData(campanha.createdAt) }}
                    </td>
                    <td class="px-4 py-3 text-sm">
                      <div class="flex justify-end gap-2">
                        <button
                          v-if="campanha.statusNormalizado === 'pendente'"
                          type="button"
                          class="inline-flex items-center gap-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
                          @click.stop="abrirModalEdicao(campanha)"
                        >
                          <EditIcon class="h-4 w-4" />
                          Editar
                        </button>
                        <button
                          v-if="campanha.statusNormalizado === 'pendente'"
                          type="button"
                          class="inline-flex items-center gap-1 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 transition hover:bg-red-50 focus:outline-hidden focus:ring-2 focus:ring-red-200/60 dark:border-red-900/60 dark:text-red-300 dark:hover:bg-red-900/30"
                          @click.stop="confirmarExclusao(campanha)"
                        >
                          <TrashIcon class="h-4 w-4" />
                          Excluir
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
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
                    :class="page === paginaAtual ? 'bg-brand-500 text-white shadow-theme-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10'"
                    @click="irParaPagina(page)"
                  >
                    {{ (page as number) + 1 }}
                  </button>
                </template>
              </div>
            </div>
          </div>
        </CardBox>

        <CardBox v-else-if="currentStep === 2" class="flex flex-col flex-1">
          <div class="flex flex-col gap-5 flex-1">
            <div class="flex flex-col gap-2">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Seleção de pacientes</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Campanha: <span class="font-medium text-gray-700 dark:text-gray-200">{{ campanhaEmExecucao?.nome }}</span>
              </p>
              <div v-if="resumoFiltros.length" class="flex flex-wrap gap-2">
                <span
                  v-for="filtro in resumoFiltros"
                  :key="filtro.label"
                  class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-gray-800/60 dark:text-gray-300"
                >
                  <span class="text-gray-400">{{ filtro.label }}:</span>
                  <span class="ml-1">{{ filtro.value }}</span>
                </span>
              </div>
            </div>

            <div class="flex flex-col gap-3 flex-1 overflow-hidden">
              <div class="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                <span>
                  Pacientes selecionados: <span class="font-semibold text-gray-700 dark:text-gray-200">{{ totalPacientesSelecionados }}</span>
                </span>
                <button
                  v-if="totalPacientesSelecionados > 0"
                  type="button"
                  class="text-xs font-medium text-brand-600 hover:underline"
                  @click="limparSelecaoPacientes"
                >
                  Limpar seleção
                </button>
              </div>

              <div class="flex-1 overflow-x-auto">
                <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                  <thead class="bg-gray-50 dark:bg-gray-800/60">
                    <tr>
                      <th class="w-12 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        <input
                          ref="checkboxCabecalho"
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          :checked="todosSelecionadosPagina"
                          @change="alternarSelecaoPagina"
                        />
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Paciente
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        E-mail
                      </th>
                      <th class="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                        Telefone
                      </th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                    <tr v-if="carregandoPacientes">
                      <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Buscando pacientes elegíveis...
                      </td>
                    </tr>
                    <tr v-else-if="erroPacientes">
                      <td colspan="4" class="px-4 py-6 text-center text-sm text-red-500">
                        {{ erroPacientes }}
                      </td>
                    </tr>
                    <tr v-else-if="pacientesOrdenados.length === 0">
                      <td colspan="4" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                        Nenhum paciente encontrado com os filtros selecionados.
                      </td>
                    </tr>
                    <tr
                      v-for="paciente in pacientesPaginados"
                      v-else
                      :key="paciente.id"
                      :class="[
                        'transition hover:bg-gray-50 dark:hover:bg-white/5',
                        pacientesSelecionadosSet.has(paciente.id) ? 'bg-brand-500/5 dark:bg-brand-500/10' : '',
                      ]"
                    >
                      <td class="px-4 py-3">
                        <input
                          type="checkbox"
                          class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                          :checked="pacientesSelecionadosSet.has(paciente.id)"
                          @change="alternarPaciente(paciente.id)"
                        />
                      </td>
                      <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-200">
                        {{ paciente.nome }}
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {{ paciente.email || '—' }}
                      </td>
                      <td class="px-4 py-3 text-sm text-gray-600 dark:text-gray-300">
                        {{ paciente.telefone || '—' }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="flex flex-col gap-2 border-t border-gray-100 pt-4 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400 sm:flex-row sm:items-center sm:justify-between">
                <div>Mostrando página {{ paginaAtualPacientesHuman }} de {{ totalPaginasPacientes }}</div>
                <div class="flex flex-wrap items-center gap-1">
                  <template v-for="page in paginasVisiveisPacientes" :key="`${page}-${paginaAtualPacientes}`">
                    <button
                      v-if="page === 'prev' || page === 'next'"
                      type="button"
                      class="rounded-lg border border-gray-200 px-3 py-1 text-xs text-gray-600 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
                      @click="irParaPaginaPacientes(page)"
                    >
                      ...
                    </button>
                    <button
                      v-else
                      type="button"
                      class="rounded-lg px-3 py-1 text-xs font-medium"
                      :class="page === paginaAtualPacientes ? 'bg-brand-500 text-white shadow-theme-sm' : 'border border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10'"
                      @click="irParaPaginaPacientes(page)"
                    >
                      {{ (page as number) + 1 }}
                    </button>
                  </template>
                </div>
              </div>
            </div>

            <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10 sm:w-auto"
                @click="voltarParaLista"
              >
                Voltar
              </button>
              <button
                type="button"
                class="w-full rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-brand-600 focus:outline-hidden focus:ring-2 focus:ring-brand-400/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                :disabled="totalPacientesSelecionados === 0 || carregandoPacientes"
                @click="avancarParaEmail"
              >
                Avançar
              </button>
            </div>
          </div>
        </CardBox>

        <CardBox v-else class="flex flex-col flex-1">
          <div class="flex flex-col gap-5 flex-1">
            <div class="flex flex-col gap-2">
              <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">Criação do e-mail</h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                Destinatários selecionados: <span class="font-medium text-gray-700 dark:text-gray-200">{{ totalPacientesSelecionados }}</span>
              </p>
            </div>

            <Suspense>
              <template #default>
                <TinyMceEditor v-model="conteudoEmail" :init="tinyInit" class="min-h-[400px]" />
              </template>
              <template #fallback>
                <div class="flex h-64 items-center justify-center rounded-xl border border-dashed border-gray-300 text-sm text-gray-500 dark:border-gray-700 dark:text-gray-300">
                  Carregando editor...
                </div>
              </template>
            </Suspense>

            <div class="flex flex-col gap-2 sm:flex-row sm:justify-between">
              <button
                type="button"
                class="w-full rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10 sm:w-auto"
                @click="voltarParaSelecaoPacientes"
              >
                Voltar
              </button>
              <button
                type="button"
                class="w-full rounded-lg bg-emerald-500 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-emerald-600 focus:outline-hidden focus:ring-2 focus:ring-emerald-300/50 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
                :disabled="!podeFinalizar"
                @click="finalizarEnvio"
              >
                Finalizar envio
              </button>
            </div>
          </div>
        </CardBox>
      </div>

      <ModalCampanha
        :aberta="modalCampanhaAberta"
        :campanha="campanhaEmEdicao"
        @fechar="modalCampanhaAberta = false"
        @sucesso="handleSucessoModal"
        @erro="handleErroModal"
      />

      <Modal v-if="mostrarModalEnvio" full-screen-backdrop @close="fecharModalEnvio">
        <template #body>
          <div class="w-full max-w-md rounded-3xl bg-white p-6 text-center shadow-theme-xl dark:bg-gray-900">
            <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Processando envio</h3>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">{{ mensagemEnvio }}</p>

            <div v-if="estadoEnvio === 'progresso'" class="mt-6">
              <div class="relative h-3 w-full overflow-hidden rounded-full bg-gray-100 dark:bg-gray-800">
                <div class="absolute inset-0 h-full w-1/2 animate-[progress_1.2s_linear_infinite] rounded-full bg-brand-500"></div>
              </div>
              <p class="mt-3 text-xs text-gray-400">Esse processo pode levar alguns instantes.</p>
            </div>

            <div v-else class="mt-6 flex flex-col gap-3">
              <button
                type="button"
                class="inline-flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 focus:outline-hidden focus:ring-2 focus:ring-brand-400/40 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/10"
                @click="fecharModalEnvio"
              >
                Fechar
              </button>
            </div>
          </div>
        </template>
      </Modal>
    </SectionMain>
  </LayoutAuthenticated>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent, onMounted, ref, watch, watchEffect } from 'vue'
import LayoutAuthenticated from '@/components/layout/LayoutAuthenticated.vue'
import SectionMain from '@/components/layout/SectionMain.vue'
import PageBreadcrumb from '@/components/common/PageBreadcrumb.vue'
import CardBox from '@/components/layout/CardBox.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import ModalCampanha from '@/components/marketing/ModalCampanha.vue'
import api from '@/plugins/axios'
import { EditIcon, SendIcon, TrashIcon } from '@/icons'
import { useToast } from '@/composables/useToast'

type NotificationVariant = 'success' | 'error' | 'info' | 'warning'

type CampanhaStatus = 'pendente' | 'enviada' | string

interface CampanhaRaw {
  id?: string | number
  nome?: string
  status?: string
  createdAt?: string | null
  created_at?: string | null
  criadaEm?: string | null
  criada_em?: string | null
  filtros?: Record<string, unknown>
  sexo?: string | null
  idadeMinima?: number | null
  idadeMaxima?: number | null
  idade_minima?: number | null
  idade_maxima?: number | null
  uf?: string | null
  cidade?: string | null
  comEmail?: boolean | number | null
  comTelefone?: boolean | number | null
}

interface Campanha {
  id: string | number
  nome: string
  status: CampanhaStatus
  statusNormalizado: 'pendente' | 'enviada' | string
  createdAt: string | null
  filtros: CampanhaFiltros
}

interface CampanhaFiltros {
  sexo: string | null
  idadeMinima: number | null
  idadeMaxima: number | null
  uf: string | null
  cidade: string | null
  comEmail: boolean
  comTelefone: boolean
}

interface PacienteRaw {
  id?: string | number
  clinic_id?: string | number | null
  nome_completo?: string
  nome?: string
  nomeSocial?: string
  nome_social?: string
  email?: string | null
  tbEmail?: string | null
  telefone_principal?: string | null
  telefone?: string | null
  telefone_celular?: string | null
  telefone_comercial?: string | null
  tbFoneRes?: string | null
  tbCelular?: string | null
  tbFoneCom?: string | null
  cpf?: string | null
  tbCPF?: string | null
}

interface Paciente {
  id: string | number
  nome: string
  email: string | null
  telefone: string | null
}

const TinyMceEditor = defineAsyncComponent(async () => {
  // @ts-expect-error - módulo provido em tempo de build
  const module = await import('@tinymce/tinymce-vue')
  return module.Editor || module.default
})

const tinyInit = {
  height: 420,
  menubar: false,
  language: 'pt_BR',
  plugins: 'lists link table code autoresize',
  toolbar:
    'undo redo | bold italic underline | alignleft aligncenter alignright alignjustify | bullist numlist outdent indent | link table | removeformat code',
  branding: false,
}

const pageTitle = 'Campanhas de Marketing'

const toast = useToast()

const mostrarNotificacao = (type: NotificationVariant, message: string) => {
  switch (type) {
    case 'success':
      toast.success(message)
      break
    case 'error':
      toast.error(message)
      break
    case 'info':
      toast.info(message)
      break
    case 'warning':
    default:
      toast.warning(message)
      break
  }
}

const currentStep = ref(1)
const breadcrumbButtons = computed(() => ({
  novo: currentStep.value === 1,
}))
const campanhas = ref<Campanha[]>([])
const carregandoCampanhas = ref(false)
const selecionadaId = ref<string | number | null>(null)
const perPage = ref(10)
const paginaAtual = ref(0)
const perPageOptions = [5, 10, 20, 50]
const maxPaginasVisiveis = 5

const campanhasOrdenadas = computed(() =>
  [...campanhas.value].sort((a, b) => {
    const dataA = a.createdAt ? new Date(a.createdAt).getTime() : 0
    const dataB = b.createdAt ? new Date(b.createdAt).getTime() : 0
    return dataB - dataA
  }),
)

const totalPaginas = computed(() => {
  if (campanhasOrdenadas.value.length === 0) return 1
  return Math.max(1, Math.ceil(campanhasOrdenadas.value.length / perPage.value))
})

const campanhasPaginadas = computed(() => {
  const start = paginaAtual.value * perPage.value
  const end = start + perPage.value
  return campanhasOrdenadas.value.slice(start, end)
})

const paginaAtualHuman = computed(() => (campanhasOrdenadas.value.length ? paginaAtual.value + 1 : 0))

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

watch([campanhasOrdenadas, perPage], () => {
  if (paginaAtual.value > totalPaginas.value - 1) {
    paginaAtual.value = Math.max(0, totalPaginas.value - 1)
  }
})

const irParaPagina = (page: number | string) => {
  if (page === 'prev') {
    paginaAtual.value = Math.max(paginaAtual.value - (maxPaginasVisiveis - 2), 0)
  } else if (page === 'next') {
    paginaAtual.value = Math.min(paginaAtual.value + (maxPaginasVisiveis - 2), totalPaginas.value - 1)
  } else {
    paginaAtual.value = page as number
  }
}

const modalCampanhaAberta = ref(false)
const campanhaEmEdicao = ref<Campanha | null>(null)

const campanhaEmExecucao = ref<Campanha | null>(null)
const pacientes = ref<Paciente[]>([])
const carregandoPacientes = ref(false)
const erroPacientes = ref('')
const paginaAtualPacientes = ref(0)
const perPagePacientes = ref(10)
const maxPaginasVisiveisPacientes = 5
const pacientesSelecionados = ref<Set<string | number>>(new Set())
const checkboxCabecalho = ref<HTMLInputElement | null>(null)
const conteudoEmail = ref('')

const pacientesOrdenados = computed(() =>
  [...pacientes.value].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
)

const totalPaginasPacientes = computed(() => {
  if (pacientesOrdenados.value.length === 0) return 1
  return Math.max(1, Math.ceil(pacientesOrdenados.value.length / perPagePacientes.value))
})

const pacientesPaginados = computed(() => {
  const start = paginaAtualPacientes.value * perPagePacientes.value
  const end = start + perPagePacientes.value
  return pacientesOrdenados.value.slice(start, end)
})

const paginaAtualPacientesHuman = computed(() =>
  pacientesOrdenados.value.length ? paginaAtualPacientes.value + 1 : 0,
)

const paginasVisiveisPacientes = computed(() => {
  const total = totalPaginasPacientes.value
  const current = paginaAtualPacientes.value

  if (total <= maxPaginasVisiveisPacientes) {
    return Array.from({ length: total }, (_, index) => index)
  }

  if (current <= 2) {
    return [...Array.from({ length: maxPaginasVisiveisPacientes }, (_, index) => index), 'next']
  }

  if (current >= total - 3) {
    return ['prev', ...Array.from({ length: maxPaginasVisiveisPacientes }, (_, index) => total - maxPaginasVisiveisPacientes + index)]
  }

  return [
    'prev',
    ...Array.from({ length: maxPaginasVisiveisPacientes - 2 }, (_, index) => current - 2 + index),
    'next',
  ]
})

watch([pacientesOrdenados, perPagePacientes], () => {
  if (paginaAtualPacientes.value > totalPaginasPacientes.value - 1) {
    paginaAtualPacientes.value = Math.max(0, totalPaginasPacientes.value - 1)
  }
})

const irParaPaginaPacientes = (page: number | string) => {
  if (page === 'prev') {
    paginaAtualPacientes.value = Math.max(paginaAtualPacientes.value - (maxPaginasVisiveisPacientes - 2), 0)
  } else if (page === 'next') {
    paginaAtualPacientes.value = Math.min(
      paginaAtualPacientes.value + (maxPaginasVisiveisPacientes - 2),
      totalPaginasPacientes.value - 1,
    )
  } else {
    paginaAtualPacientes.value = page as number
  }
}

const pacientesSelecionadosSet = computed(() => pacientesSelecionados.value)
const totalPacientesSelecionados = computed(() => pacientesSelecionados.value.size)

const todosSelecionadosPagina = computed(() =>
  pacientesPaginados.value.length > 0 && pacientesPaginados.value.every((paciente) => pacientesSelecionados.value.has(paciente.id)),
)

const isIndeterminado = computed(() =>
  pacientesPaginados.value.some((paciente) => pacientesSelecionados.value.has(paciente.id)) &&
  !todosSelecionadosPagina.value,
)

watchEffect(() => {
  if (checkboxCabecalho.value) {
    checkboxCabecalho.value.indeterminate = isIndeterminado.value
  }
})

const resumoFiltros = computed(() => {
  const filtros: { label: string; value: string }[] = []
  const campanha = campanhaEmExecucao.value
  if (!campanha) return filtros

  if (campanha.filtros.sexo && campanha.filtros.sexo !== 'Todos') {
    filtros.push({ label: 'Sexo', value: campanha.filtros.sexo })
  }
  if (campanha.filtros.idadeMinima !== null) {
    filtros.push({ label: 'Idade mínima', value: String(campanha.filtros.idadeMinima) })
  }
  if (campanha.filtros.idadeMaxima !== null) {
    filtros.push({ label: 'Idade máxima', value: String(campanha.filtros.idadeMaxima) })
  }
  if (campanha.filtros.uf) {
    filtros.push({ label: 'UF', value: campanha.filtros.uf })
  }
  if (campanha.filtros.cidade) {
    filtros.push({ label: 'Cidade', value: campanha.filtros.cidade })
  }
  if (campanha.filtros.comEmail) {
    filtros.push({ label: 'Somente com e-mail', value: 'Sim' })
  }
  if (campanha.filtros.comTelefone) {
    filtros.push({ label: 'Somente com telefone', value: 'Sim' })
  }
  return filtros
})

const podeExecutar = computed(
  () => Boolean(selecionadaId.value && campanhas.value.find((item) => item.id === selecionadaId.value)?.statusNormalizado === 'pendente'),
)

const podeFinalizar = computed(
  () => totalPacientesSelecionados.value > 0 && Boolean(conteudoEmail.value.trim()) && estadoEnvio.value !== 'progresso',
)

const badgeClasse = (status: CampanhaStatus) => {
  const normalizado = String(status).toLowerCase()
  if (normalizado === 'enviada') {
    return 'bg-emerald-100 text-emerald-700'
  }
  return 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
}

const statusLabel = (status: CampanhaStatus) => {
  const normalizado = String(status).toLowerCase()
  if (normalizado === 'pendente') return 'Pendente'
  if (normalizado === 'enviada') return 'Enviada'
  return status
}

const formatarData = (data: string | null) => {
  if (!data) return '—'
  const parsed = new Date(data)
  if (Number.isNaN(parsed.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed)
}

const extrairLista = (payload: unknown): unknown[] => {
  if (Array.isArray(payload)) return payload
  if (payload && typeof payload === 'object') {
    const dados = (payload as { dados?: unknown }).dados
    if (Array.isArray(dados)) return dados
    const data = (payload as { data?: unknown }).data
    if (Array.isArray(data)) return data
  }
  return []
}

const normalizarCampanha = (entrada: CampanhaRaw): Campanha | null => {
  const id = entrada.id ?? null
  const nome = entrada.nome ?? ''
  if (id === null || nome.trim() === '') {
    return null
  }

  const statusBruto = entrada.status ?? 'pendente'
  const normalizado = String(statusBruto).toLowerCase() as 'pendente' | 'enviada' | string
  const filtrosOrigem = entrada.filtros ?? entrada

  const filtros: CampanhaFiltros = {
    sexo: (filtrosOrigem?.sexo as string | null) ?? null,
    idadeMinima:
      (filtrosOrigem?.idadeMinima as number | null) ??
      (filtrosOrigem?.idade_minima as number | null) ??
      null,
    idadeMaxima:
      (filtrosOrigem?.idadeMaxima as number | null) ??
      (filtrosOrigem?.idade_maxima as number | null) ??
      null,
    uf: (filtrosOrigem?.uf as string | null)?.toUpperCase() ?? null,
    cidade: (filtrosOrigem?.cidade as string | null) ?? null,
    comEmail: Boolean(filtrosOrigem?.comEmail ?? filtrosOrigem?.com_email),
    comTelefone: Boolean(filtrosOrigem?.comTelefone ?? filtrosOrigem?.com_telefone),
  }

  const createdAt =
    entrada.createdAt ?? entrada.created_at ?? entrada.criadaEm ?? entrada.criada_em ?? null

  return {
    id,
    nome,
    status: statusBruto,
    statusNormalizado: normalizado,
    createdAt,
    filtros,
  }
}

const carregarCampanhas = async () => {
  try {
    carregandoCampanhas.value = true
    const selecionadoAnterior = selecionadaId.value
    const { data } = await api.get('/marketing/campanhas')
    const lista = extrairLista(data)
      .map((item) => normalizarCampanha(item as CampanhaRaw))
      .filter((item): item is Campanha => Boolean(item))

    campanhas.value = lista

    if (selecionadoAnterior !== null && lista.some((item) => item.id === selecionadoAnterior)) {
      selecionadaId.value = selecionadoAnterior
    } else {
      selecionadaId.value = null
    }
  } catch (err: unknown) {
    const mensagem = obterMensagemDeErro(err, 'Não foi possível carregar as campanhas.')
    mostrarNotificacao('error', mensagem)
    campanhas.value = []
    selecionadaId.value = null
  } finally {
    carregandoCampanhas.value = false
  }
}

const obterMensagemDeErro = (erro: unknown, padrao: string) => {
  const resposta = (erro as { response?: { data?: { mensagem?: string; message?: string } } }).response?.data
  if (resposta?.mensagem) return resposta.mensagem
  if (resposta?.message) return resposta.message
  if ((erro as { message?: string }).message) return (erro as { message?: string }).message as string
  return padrao
}

const abrirModalCriacao = () => {
  campanhaEmEdicao.value = null
  modalCampanhaAberta.value = true
}

const abrirModalEdicao = (campanha: Campanha) => {
  campanhaEmEdicao.value = campanha
  modalCampanhaAberta.value = true
}

const selecionarCampanha = (id: string | number) => {
  selecionadaId.value = selecionadaId.value === id ? null : id
}

const confirmarExclusao = async (campanha: Campanha) => {
  const confirmado = window.confirm(`Deseja realmente excluir a campanha "${campanha.nome}"?`)
  if (!confirmado) return

  try {
    await api.delete(`/marketing/campanhas/${campanha.id}`)
    mostrarNotificacao('success', 'Campanha excluída com sucesso!')
    await carregarCampanhas()
  } catch (err: unknown) {
    const mensagem = obterMensagemDeErro(err, 'Erro ao excluir campanha.')
    mostrarNotificacao('error', mensagem)
  }
}

const handleSucessoModal = (mensagem: string) => {
  mostrarNotificacao('success', mensagem)
  modalCampanhaAberta.value = false
  carregarCampanhas()
}

const handleErroModal = (mensagem: string, tipo: NotificationVariant = 'error') => {
  if (mensagem) {
    mostrarNotificacao(tipo, mensagem)
  }
}

const limparSelecaoPacientes = () => {
  pacientesSelecionados.value = new Set()
}

const alternarPaciente = (id: string | number) => {
  const set = new Set(pacientesSelecionados.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  pacientesSelecionados.value = set
}

const alternarSelecaoPagina = (evento: Event) => {
  const alvo = evento.target as HTMLInputElement
  if (alvo.checked) {
    const novos = new Set(pacientesSelecionados.value)
    pacientesPaginados.value.forEach((paciente) => novos.add(paciente.id))
    pacientesSelecionados.value = novos
  } else {
    const novos = new Set(pacientesSelecionados.value)
    pacientesPaginados.value.forEach((paciente) => novos.delete(paciente.id))
    pacientesSelecionados.value = novos
  }
}

const normalizarPaciente = (item: PacienteRaw): Paciente | null => {
  const nome = item.nome_completo ?? item.nome ?? ''
  if (!nome.trim()) return null

  const email = item.email ?? item.tbEmail ?? null
  const telefone =
    item.telefone_principal ??
    item.telefone ??
    item.telefone_celular ??
    item.telefone_comercial ??
    item.tbFoneRes ??
    item.tbCelular ??
    item.tbFoneCom ??
    null

  const id =
    item.id ??
    item.clinic_id ??
    (item.cpf ?? item.tbCPF) ??
    `${nome}-${email ?? ''}`

  return {
    id,
    nome,
    email,
    telefone,
  }
}

const montarParametrosPacientes = (filtros: CampanhaFiltros) => {
  const params: Record<string, unknown> = {}
  if (filtros.sexo && filtros.sexo !== 'Todos') params.sexo = filtros.sexo
  if (filtros.idadeMinima !== null) params.idadeMinima = filtros.idadeMinima
  if (filtros.idadeMaxima !== null) params.idadeMaxima = filtros.idadeMaxima
  if (filtros.uf) params.uf = filtros.uf
  if (filtros.cidade) params.cidade = filtros.cidade
  if (filtros.comEmail) params.comEmail = true
  if (filtros.comTelefone) params.comTelefone = true
  return params
}

const carregarPacientes = async () => {
  if (!campanhaEmExecucao.value) return

  carregandoPacientes.value = true
  erroPacientes.value = ''
  pacientes.value = []
  pacientesSelecionados.value = new Set()

  const params = montarParametrosPacientes(campanhaEmExecucao.value.filtros)
  const rotas = ['/pacientes', '/pacientesclinic'] as const
  const acumulado = new Map<string | number, Paciente>()
  let ultimoErro: string | null = null

  for (const rota of rotas) {
    try {
      const { data } = await api.get(rota, Object.keys(params).length ? { params } : undefined)
      const lista = extrairLista(data)
        .map((item) => normalizarPaciente(item as PacienteRaw))
        .filter((item): item is Paciente => Boolean(item))

      for (const paciente of lista) {
        if (!acumulado.has(paciente.id)) {
          acumulado.set(paciente.id, paciente)
        }
      }
    } catch (err: unknown) {
      ultimoErro = obterMensagemDeErro(err, 'Falha ao buscar pacientes.')
    }
  }

  pacientes.value = Array.from(acumulado.values())

  if (!pacientes.value.length && ultimoErro) {
    erroPacientes.value = ultimoErro
  }

  carregandoPacientes.value = false
}

const executarCampanha = () => {
  const campanha = campanhas.value.find((item) => item.id === selecionadaId.value)
  if (!campanha || campanha.statusNormalizado !== 'pendente') {
    mostrarNotificacao('warning', 'Selecione uma campanha pendente para executar.')
    return
  }

  campanhaEmExecucao.value = campanha
  currentStep.value = 2
  paginaAtualPacientes.value = 0
  carregarPacientes()
}

const voltarParaLista = () => {
  currentStep.value = 1
  campanhaEmExecucao.value = null
  pacientes.value = []
  pacientesSelecionados.value = new Set()
  conteudoEmail.value = ''
}

const voltarParaSelecaoPacientes = () => {
  currentStep.value = 2
}

const avancarParaEmail = () => {
  if (totalPacientesSelecionados.value === 0) {
    mostrarNotificacao('warning', 'Selecione ao menos um paciente para continuar.')
    return
  }
  currentStep.value = 3
}

const estadoEnvio = ref<'idle' | 'progresso' | 'sucesso' | 'erro'>('idle')
const mensagemEnvio = ref('')
const mostrarModalEnvio = ref(false)

const finalizarEnvio = async () => {
  if (!campanhaEmExecucao.value) return
  if (!totalPacientesSelecionados.value) {
    mostrarNotificacao('warning', 'Selecione ao menos um paciente para enviar o e-mail.')
    currentStep.value = 2
    return
  }
  if (!conteudoEmail.value.trim()) {
    mostrarNotificacao('warning', 'Escreva o conteúdo do e-mail antes de finalizar.')
    return
  }

  estadoEnvio.value = 'progresso'
  mensagemEnvio.value = 'Enviando e-mails para os pacientes selecionados...'
  mostrarModalEnvio.value = true

  try {
    const payload = {
      patientIds: Array.from(pacientesSelecionados.value),
      html: conteudoEmail.value,
    }
    await api.post(`/marketing/campanhas/${campanhaEmExecucao.value.id}/enviar`, payload)
    estadoEnvio.value = 'sucesso'
    mensagemEnvio.value = 'Emails enviados com sucesso!'
    mostrarNotificacao('success', 'Emails enviados com sucesso!')
    await carregarCampanhas()
    setTimeout(() => {
      fecharModalEnvio()
      voltarParaLista()
    }, 1200)
  } catch (err: unknown) {
    estadoEnvio.value = 'erro'
    mensagemEnvio.value = obterMensagemDeErro(err, 'Falha ao enviar os e-mails da campanha.')
    mostrarNotificacao('error', mensagemEnvio.value)
  }
}

const fecharModalEnvio = () => {
  if (estadoEnvio.value === 'progresso') return
  mostrarModalEnvio.value = false
  estadoEnvio.value = 'idle'
  mensagemEnvio.value = ''
}

onMounted(() => {
  carregarCampanhas()
})
</script>

<style scoped>
@keyframes progress {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(200%);
  }
}
</style>

