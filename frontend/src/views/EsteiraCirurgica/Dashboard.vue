<template>
  <AdminLayout>
    <div class="space-y-10 p-6">
      <section class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
            {{ route.meta.title }}
          </h1>
          <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
            Acompanhe os principais indicadores e gargalos da esteira cirúrgica.
          </p>
        </div>

        <div class="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-end sm:justify-end">
          <div class="grid gap-3 sm:grid-cols-3">
            <div class="flex flex-col gap-1">
              <label for="filtro-data-inicio" class="text-xs font-medium text-gray-600 dark:text-gray-300">Início</label>
              <input
                id="filtro-data-inicio"
                v-model="filtros.dataInicio"
                type="date"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="filtro-data-fim" class="text-xs font-medium text-gray-600 dark:text-gray-300">Fim</label>
              <input
                id="filtro-data-fim"
                v-model="filtros.dataFim"
                type="date"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              />
            </div>
            <div class="flex flex-col gap-1">
              <label for="filtro-tipo-data" class="text-xs font-medium text-gray-600 dark:text-gray-300">Data de referência</label>
              <select
                id="filtro-tipo-data"
                v-model="filtros.tipoData"
                class="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
              >
                <option v-for="opcao in DATA_REFERENCIA_OPTIONS" :key="opcao.value" :value="opcao.value">
                  {{ opcao.label }}
                </option>
              </select>
            </div>
          </div>

          <div class="flex flex-col items-stretch sm:items-center">
            <button
              type="button"
              class="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary-700 transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70 dark:border-primary-light dark:bg-white dark:text-primary-900 dark:hover:bg-primary-light/20 dark:focus:ring-primary-light dark:focus:ring-offset-gray-900"
              :disabled="atualizandoDashboard"
              @click="atualizarDashboard"
            >
              <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M16.023 9.348h4.992v-.001m-9.935 9.652a8.25 8.25 0 01-6.364-13.5l.011-.011 2.411 2.41m10.719-1.183a8.25 8.25 0 01-3.663 13.083"
                />
              </svg>
              Atualizar
            </button>
          </div>
        </div>
      </section>

      <section class="space-y-4">
        <div v-if="procedimentosError" class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200">
          {{ procedimentosError }}
        </div>

        <div
          v-if="procedimentosLoading"
          class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="h-52 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div class="mt-4 h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        <template v-else>
          <div v-if="temSolicitacoes" class="grid gap-6 lg:grid-cols-3">
            <div class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800 lg:col-span-2">
              <div class="space-y-1">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
                  Progresso das liberações críticas
                </h2>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Total de solicitações monitoradas: {{ totalSolicitacoes }}
                </p>
              </div>

              <div class="mt-4">
                <VueApexCharts type="bar" height="260" :options="liberacoesChartOptions" :series="liberacoesChartSeries" />
              </div>

              <div
                v-if="solicitacoesSemanais"
                class="mt-6 space-y-4 rounded-lg border border-gray-100 bg-white/90 p-4 dark:border-gray-700 dark:bg-gray-900/70"
              >
                <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 class="text-sm font-semibold text-gray-800 dark:text-gray-100">
                      Solicitações por semana
                    </h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      Volume das últimas quatro semanas da esteira.
                    </p>
                  </div>
                  <p
                    v-if="solicitacoesSemanaisPeriodoTexto"
                    class="text-xs font-medium text-gray-500 dark:text-gray-400"
                  >
                    Período: {{ solicitacoesSemanaisPeriodoTexto }}
                  </p>
                </div>

                <div>
                  <VueApexCharts
                    v-if="temSolicitacoesSemanais"
                    type="bar"
                    height="220"
                    :options="solicitacoesSemanaisChartOptions"
                    :series="solicitacoesSemanaisChartSeries"
                  />
                  <div
                    v-else
                    class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-center text-xs text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                  >
                    Ainda não há solicitações suficientes nas últimas semanas.
                  </div>
                </div>
              </div>
            </div>

            <div class="space-y-4">
              <div class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
                  Indicadores por liberação
                </h2>
                <ul class="mt-4 space-y-3">
                  <li
                    v-for="categoria in liberacaoCategorias"
                    :key="categoria.key"
                    :class="[
                      'rounded-lg border p-4 transition-colors',
                      categoria.isCritical
                        ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200'
                        : 'border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-700 dark:bg-gray-800/70 dark:text-gray-200',
                    ]"
                  >
                    <div class="flex items-start justify-between gap-4">
                      <div>
                        <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {{ categoria.label }}
                        </p>
                        <p class="mt-1 text-2xl font-semibold">
                          {{ categoria.concluido }}
                        </p>
                        <p class="text-xs text-gray-500 dark:text-gray-400">
                          de {{ categoria.total }} ({{ categoria.percentual.toFixed(1) }}%)
                        </p>
                      </div>
                      <div class="text-right">
                        <p class="text-xs font-medium text-gray-500 dark:text-gray-400">
                          Pendentes
                        </p>
                        <p class="text-lg font-semibold text-gray-800 dark:text-gray-100">
                          {{ categoria.pendentes }}
                        </p>
                      </div>
                    </div>
                  </li>
                </ul>
              </div>

              <div
                :class="[
                  'rounded-lg border p-4 text-sm shadow-sm transition-colors',
                  criticalCategories.length
                    ? 'border-red-200 bg-red-50 text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-400/60 dark:bg-emerald-950/40 dark:text-emerald-200',
                ]"
              >
                <template v-if="criticalCategories.length">
                  <h3 class="text-sm font-semibold">
                    Atenção às liberações com menor desempenho
                  </h3>
                  <ul class="mt-2 space-y-1">
                    <li v-for="categoria in criticalCategories" :key="`critica-${categoria.key}`">
                      {{ categoria.label }}: {{ categoria.percentual.toFixed(1) }}% concluído ({{ categoria.concluido }} de
                      {{ categoria.total }})
                    </li>
                  </ul>
                  <p class="mt-2 text-xs">
                    Priorize as etapas acima para equilibrar o fluxo da esteira.
                  </p>
                </template>
                <template v-else>
                  <h3 class="text-sm font-semibold">
                    Nenhuma liberação crítica identificada
                  </h3>
                  <p class="mt-2 text-xs">
                    Todas as liberações apresentam percentuais semelhantes. Continue monitorando para manter o equilíbrio.
                  </p>
                </template>
              </div>
            </div>
          </div>

          <div
            v-else
            class="rounded-lg border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
          >
            Nenhuma solicitação crítica registrada até o momento.
          </div>
        </template>
      </section>

      <section class="space-y-4">
        <div
          v-if="temposAviso"
          class="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-900 shadow-sm dark:border-yellow-500/40 dark:bg-yellow-950/40 dark:text-yellow-100"
        >
          {{ temposAviso }}
        </div>

        <div class="rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800">
          <div class="border-b border-gray-100 px-6 py-4 text-lg font-semibold text-gray-800 dark:border-gray-700 dark:text-white">
            Tempos médios por etapa
          </div>
          <div class="p-4">
            <VueApexCharts type="bar" height="360" :options="temposChartOptions" :series="temposChartSeries" />
          </div>
        </div>

        <div v-if="sortedTemposMedios.length" class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div
            v-for="item in sortedTemposMedios"
            :key="item.etapaId ?? item.etapaNome"
            class="rounded-lg border border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md dark:border-gray-700 dark:bg-gray-800"
          >
            <div class="flex items-start justify-between gap-4">
              <h3 class="text-base font-medium text-gray-900 dark:text-gray-100">
                {{ item.etapaNome }}
              </h3>
              <span class="text-sm font-semibold text-primary-600 dark:text-primary-400">
                {{ formatDuration(item.duracaoMediaSegundos) }}
              </span>
            </div>
            <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {{ item.volume }}
              {{ item.volume === 1 ? 'card considerado' : 'cards considerados' }}
            </p>
          </div>
        </div>

        <div
          v-else
          class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
        >
          Ainda não há etapas concluídas suficientes para exibir no gráfico.
        </div>
      </section>

      <section class="space-y-4">
        <header class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Resumo geral da esteira</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Acompanhe o volume de etapas da esteira cirúrgica e destaque rapidamente gargalos.
            </p>
          </div>
          <p v-if="ultimaAtualizacaoResumo" class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Atualizado em {{ ultimaAtualizacaoResumo }}
          </p>
        </header>

        <div v-if="etapasError" class="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 shadow-sm dark:border-rose-500/50 dark:bg-rose-950/40 dark:text-rose-200">
          {{ etapasError }}
        </div>

        <div
          v-if="etapasLoading"
          class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900"
        >
          <div class="h-52 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div class="mt-4 h-4 w-2/3 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        <template v-else>
          <div
            v-if="etapasResumo?.estaVazio"
            class="rounded-lg border border-dashed border-gray-300 bg-white p-8 text-center text-gray-600 shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            Nenhuma etapa encontrada. Assim que novas solicitações forem registradas, este painel exibirá o andamento das etapas.
          </div>

          <div v-else class="space-y-6">
            <div class="grid gap-4 md:grid-cols-3">
              <article
                v-for="card in resumoCards"
                :key="card.chave"
                :title="card.descricao"
                class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-900"
              >
                <div class="flex items-center justify-between">
                  <div>
                    <p class="text-sm font-semibold text-gray-500 dark:text-gray-400">
                      {{ card.titulo }}
                    </p>
                    <p class="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                      {{ formatarNumero(card.valor) }}
                    </p>
                  </div>
                  <span class="inline-flex h-12 w-12 items-center justify-center rounded-full text-white" :class="card.classeCor">
                    {{ card.icone }}
                  </span>
                </div>
                <p class="mt-3 text-sm text-gray-600 dark:text-gray-300">
                  Representa <strong>{{ formatarPercentual(card.percentual) }}</strong> das etapas monitoradas.
                </p>
              </article>
            </div>

            <article class="rounded-lg border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-900">
              <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white">Distribuição das etapas</h3>
                  <p class="text-sm text-gray-600 dark:text-gray-300">
                    Gráfico de pizza comparando pendências, etapas em andamento e concluídas.
                  </p>
                </div>
                <p class="text-sm text-gray-500 dark:text-gray-400">
                  Total monitorado: <strong>{{ formatarNumero(etapasResumo?.total ?? 0) }}</strong> etapas
                </p>
              </div>
              <div class="mt-6">
                <VueApexCharts type="pie" height="280" :options="resumoChartOptions" :series="resumoChartSeries" />
              </div>
            </article>
          </div>
        </template>
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Fluxo semanal da esteira</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Compare solicitações criadas e concluídas nas últimas semanas.
            </p>
            <p v-if="fluxoPeriodo" class="text-xs text-gray-500 dark:text-gray-400">
              Período considerado: {{ fluxoPeriodo.inicio ?? '—' }} até {{ fluxoPeriodo.fim ?? '—' }}
            </p>
          </div>
          <div class="flex items-center gap-2">
            <span class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">Semanas</span>
            <div class="flex gap-2">
              <button
                v-for="option in filtroOptions"
                :key="option"
                type="button"
                class="rounded-lg border px-3 py-1 text-sm font-medium transition"
                :class="[
                  selectedWeeks === option
                    ? 'border-primary bg-primary text-white dark:border-primary-light dark:bg-primary-light'
                    : 'border-gray-300 bg-white text-gray-600 hover:border-primary hover:text-primary dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300',
                ]"
                @click="selectedWeeks = option"
              >
                {{ option }}
              </button>
            </div>
          </div>
        </div>

        <div v-if="fluxoError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200">
          {{ fluxoError }}
        </div>

        <div v-if="fluxoLoading" class="mt-6">
          <div class="h-56 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div v-else class="mt-6">
          <VueApexCharts
            v-if="temFluxoDados"
            type="area"
            height="320"
            :options="fluxoChartOptions"
            :series="fluxoChartSeries"
          />
          <div v-else class="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-6 text-center text-sm text-gray-600 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300">
            Não há dados suficientes para exibir o fluxo semanal no período selecionado.
          </div>
        </div>
      </section>

      <section class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800">
        <div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-gray-900 dark:text-white">Status das solicitações</h2>
            <p class="text-sm text-gray-600 dark:text-gray-300">
              Distribuição percentual dos status atuais das solicitações cadastradas.
            </p>
          </div>
          <p class="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total: {{ formatarNumero(totalStatusSolicitacoes) }} solicitações
          </p>
        </div>

        <div v-if="statusError" class="mt-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200">
          {{ statusError }}
        </div>

        <div v-if="statusLoading" class="mt-6">
          <div class="h-64 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
        </div>
        <div v-else class="mt-6">
          <VueApexCharts type="donut" height="360" :options="statusChartOptions" :series="statusChartSeries" />
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import VueApexCharts from 'vue3-apexcharts'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { useToast } from '@/composables/useToast'
import {
  fetchEsteiraProcedimentosDashboard,
  fetchEsteiraResumo,
  fetchFluxoSemanal,
  fetchStatusResumo,
  type DashboardDateFilters,
} from '@/services/esteiraDashboard'
import type {
  EtapasResumo,
  FluxoSemanalResponse,
  LiberacaoCriticaItem,
  LiberacoesCriticasResumo,
  SolicitacoesSemanaisResumo,
  TempoMedioEtapa,
} from '@/types/esteiraDashboard'

const route = useRoute()
const toast = useToast()

type DateFilterType = NonNullable<DashboardDateFilters['tipoData']>

const DATA_REFERENCIA_OPTIONS: ReadonlyArray<{ value: DateFilterType; label: string }> = [
  { value: 'criacao', label: 'Data de criação da cirurgia' },
  { value: 'ultima_movimentacao', label: 'Última movimentação' },
]

const filtros = reactive({
  dataInicio: '',
  dataFim: '',
  tipoData: DATA_REFERENCIA_OPTIONS[0].value,
})

const procedimentosLoading = ref(true)
const procedimentosError = ref<string | null>(null)
const liberacoesCriticas = ref<LiberacoesCriticasResumo | null>(null)
const solicitacoesSemanais = ref<SolicitacoesSemanaisResumo | null>(null)
const temposMedios = ref<TempoMedioEtapa[]>([])
const temposAviso = ref<string | null>(null)
const atualizadoEm = ref<string | null>(null)

const buildDashboardFilters = (): DashboardDateFilters => ({
  dataInicio: filtros.dataInicio || undefined,
  dataFim: filtros.dataFim || undefined,
  tipoData: filtros.tipoData,
})

const validarFiltros = () => {
  if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
    toast.error('A data inicial não pode ser maior que a data final.')
    return false
  }

  return true
}

interface LiberacaoCategoriaResumo {
  key: string
  etapaId: number | null
  label: string
  concluido: number
  total: number
  percentual: number
  pendentes: number
  isCritical: boolean
}

const PERCENTUAL_ALERTA = 15

const normalizarNumero = (valor: unknown, padrao = 0): number => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }

  if (typeof valor === 'bigint') {
    return Number(valor)
  }

  const convertido = Number(valor)
  return Number.isFinite(convertido) ? convertido : padrao
}

const carregarProcedimentosDashboard = async () => {
  procedimentosLoading.value = true
  procedimentosError.value = null

  try {
    const data = await fetchEsteiraProcedimentosDashboard(buildDashboardFilters())
    liberacoesCriticas.value = data.liberacoesCriticas
    solicitacoesSemanais.value = data.solicitacoesSemanais ?? null
    temposMedios.value = Array.isArray(data.temposMedios) ? data.temposMedios : []
    temposAviso.value = data.temposMediosAviso ?? null
    atualizadoEm.value = data.atualizadoEm ?? null
  } catch (error: any) {
    console.error('Erro ao carregar dashboard da esteira:', error)
    solicitacoesSemanais.value = null
    procedimentosError.value =
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      error?.message ||
      'Não foi possível carregar os dados das liberações críticas.'
    if (procedimentosError.value) {
      toast.error(procedimentosError.value)
    }
  } finally {
    procedimentosLoading.value = false
  }
}

const totalSolicitacoes = computed(() => normalizarNumero(liberacoesCriticas.value?.totalSolicitacoes, 0))

const criarChaveCategoria = (item: LiberacaoCriticaItem): string => {
  if (typeof item.etapaId === 'number' && Number.isFinite(item.etapaId)) {
    return `etapa-${item.etapaId}`
  }

  const labelNormalizado =
    typeof item.etapaNome === 'string' && item.etapaNome.trim().length
      ? item.etapaNome.trim().toLowerCase().replace(/[^a-z0-9]+/gi, '-')
      : 'etapa-sem-nome'

  return `nome-${labelNormalizado}`
}

const normalizarNomeEtapa = (nome: string | null | undefined) =>
  typeof nome === 'string' && nome.trim().length ? nome.trim() : 'Etapa sem nome'

const montarCategoria = (
  item: LiberacaoCriticaItem,
  totalPadrao: number,
): LiberacaoCategoriaResumo => {
  const etapaId = typeof item.etapaId === 'number' && Number.isFinite(item.etapaId) ? item.etapaId : null
  const label = normalizarNomeEtapa(item.etapaNome)
  const total = Math.max(0, normalizarNumero(item.total, totalPadrao))
  const concluido = Math.max(0, Math.min(total, normalizarNumero(item.concluido, 0)))
  const percentual = total > 0 ? (concluido / total) * 100 : 0

  return {
    key: criarChaveCategoria(item),
    etapaId,
    label,
    concluido,
    total,
    percentual,
    pendentes: Math.max(total - concluido, 0),
    isCritical: false,
  }
}

const liberacaoCategorias = computed<LiberacaoCategoriaResumo[]>(() => {
  const resumo = liberacoesCriticas.value
  if (!resumo || !Array.isArray(resumo.etapas) || resumo.etapas.length === 0) {
    return []
  }

  const total = Math.max(0, normalizarNumero(resumo.totalSolicitacoes, 0))

  const categorias: LiberacaoCategoriaResumo[] = resumo.etapas.map((item) => montarCategoria(item, total))

  const percentuais = categorias.map((categoria) => categoria.percentual)
  const maiorPercentual = percentuais.length ? Math.max(...percentuais) : 0

  return categorias.map((categoria) => ({
    ...categoria,
    isCritical: maiorPercentual > 0 && maiorPercentual - categoria.percentual >= PERCENTUAL_ALERTA,
  }))
})

const criticalCategories = computed(() => liberacaoCategorias.value.filter((categoria) => categoria.isCritical))

const temSolicitacoes = computed(
  () => totalSolicitacoes.value > 0 && liberacaoCategorias.value.length > 0,
)

const temSolicitacoesSemanais = computed(() => {
  const totais = solicitacoesSemanais.value?.totals
  if (!Array.isArray(totais)) {
    return false
  }

  return totais.some((valor) => valor > 0)
})

const solicitacoesSemanaisPeriodoTexto = computed(() => {
  const periodo = solicitacoesSemanais.value?.periodo
  if (!periodo) {
    return null
  }

  const inicio = formatarDataCurta(periodo.inicio)
  const fim = formatarDataCurta(periodo.fim)

  if (!inicio || !fim) {
    return null
  }

  return `${inicio} - ${fim}`
})

const formatDuration = (seconds: number | null | undefined): string => {
  if (!Number.isFinite(seconds as number) || (seconds ?? 0) < 60) {
    return 'menos de 1 min'
  }

  const totalSeconds = Math.max(0, Math.round(seconds as number))
  const totalMinutes = Math.floor(totalSeconds / 60)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours === 0) {
    return `${minutes} ${minutes === 1 ? 'min' : 'mins'}`
  }

  if (hours >= 24) {
    const days = Math.floor(hours / 24)
    const remainingHours = hours % 24
    if (remainingHours === 0) {
      return `${days} ${days === 1 ? 'dia' : 'dias'}`
    }
    return `${days} ${days === 1 ? 'dia' : 'dias'} e ${remainingHours}h`
  }

  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}min`
}

const formatarDataCurta = (valor: string | null | undefined): string | null => {
  if (!valor) {
    return null
  }

  const data = new Date(`${valor}T12:00:00Z`)
  if (Number.isNaN(data.getTime())) {
    return null
  }

  return data.toLocaleDateString('pt-BR')
}

const solicitacoesSemanaisCategorias = computed(() => solicitacoesSemanais.value?.labels ?? [])

const solicitacoesSemanaisChartSeries = computed(() => {
  if (!solicitacoesSemanais.value) {
    return []
  }

  return [
    {
      name: 'Solicitações',
      data: solicitacoesSemanais.value.totals.map((valor) => Math.max(valor ?? 0, 0)),
    },
  ]
})

const sortedTemposMedios = computed(() =>
  [...temposMedios.value].sort((a, b) => {
    const duracaoB = b.duracaoMediaSegundos ?? 0
    const duracaoA = a.duracaoMediaSegundos ?? 0

    if (duracaoB === duracaoA) {
      return (b.volume ?? 0) - (a.volume ?? 0)
    }

    return duracaoB - duracaoA
  }),
)

const temposChartSeries = computed(() => [
  {
    name: 'Tempo médio (horas)',
    data: sortedTemposMedios.value.map((item) => {
      const seconds = item.duracaoMediaSegundos ?? 0
      return Number((seconds / 3600).toFixed(2))
    }),
  },
])

const temposChartOptions = computed(() => ({
  chart: {
    id: 'esteira-dashboard-tempos-medios',
    toolbar: { show: false },
    foreColor: '#4B5563',
  },
  colors: ['#2563EB'],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '55%',
      borderRadius: 8,
      borderRadiusApplication: 'end',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: sortedTemposMedios.value.map((item) => item.etapaNome),
    labels: {
      rotate: -45,
      trim: true,
      style: {
        colors: sortedTemposMedios.value.map(() => '#4B5563'),
      },
    },
  },
  yaxis: {
    title: {
      text: 'Horas',
    },
    labels: {
      formatter: (value: number) => value.toFixed(1),
    },
  },
  tooltip: {
    shared: false,
    intersect: true,
    y: {
      formatter: (value: number, { dataPointIndex }: { dataPointIndex: number }) => {
        const item = sortedTemposMedios.value[dataPointIndex]
        if (!item) {
          return ''
        }

        const mediaFormatada = formatDuration(item.duracaoMediaSegundos)
        const quantidade = `${item.volume} ${item.volume === 1 ? 'card' : 'cards'}`
        return `${mediaFormatada} · ${quantidade}`
      },
    },
  },
  grid: {
    borderColor: '#E5E7EB',
    strokeDashArray: 4,
  },
}))

const liberacoesChartSeries = computed(() => {
  const categorias = liberacaoCategorias.value
  return [
    {
      name: 'Concluídas',
      data: categorias.map((categoria) => categoria.concluido),
    },
    {
      name: 'Pendentes',
      data: categorias.map((categoria) => categoria.pendentes),
    },
  ]
})

const liberacoesChartOptions = computed(() => {
  const categorias = liberacaoCategorias.value

  return {
    chart: {
      type: 'bar',
      stacked: true,
      toolbar: { show: false },
      foreColor: '#6b7280',
    },
    plotOptions: {
      bar: {
        horizontal: false,
        columnWidth: '45%',
        borderRadius: 6,
        borderRadiusApplication: 'end',
      },
    },
    dataLabels: {
      enabled: true,
      formatter(value: number, opts: { seriesIndex: number; dataPointIndex: number }) {
        if (opts.seriesIndex !== 0) {
          return ''
        }

        const categoria = categorias[opts.dataPointIndex]
        if (!categoria) {
          return String(value)
        }

        return `${value} (${categoria.percentual.toFixed(1)}%)`
      },
      style: {
        fontSize: '12px',
      },
    },
    xaxis: {
      categories: categorias.map((categoria) => categoria.label),
      labels: {
        style: {
          colors: '#6b7280',
        },
      },
    },
    yaxis: {
      title: {
        text: 'Solicitações',
        style: {
          color: '#6b7280',
        },
      },
      labels: {
        style: {
          colors: '#6b7280',
        },
      },
    },
    legend: {
      position: 'top',
      horizontalAlign: 'left',
      labels: {
        colors: '#6b7280',
      },
    },
    colors: ['#22c55e', '#f97316'],
    tooltip: {
      shared: true,
      intersect: false,
      y: {
        formatter(value: number, opts: { dataPointIndex: number }) {
          const categoria = categorias[opts.dataPointIndex]
          if (!categoria) {
            return `${value}`
          }

          const percentual = categoria.percentual.toFixed(1)
          return `${value} de ${categoria.total} (${percentual}%)`
        },
      },
    },
    grid: {
      borderColor: '#e5e7eb',
    },
  }
})

const etapasResumo = ref<EtapasResumo | null>(null)
const etapasAtualizadoEm = ref<string | null>(null)
const etapasLoading = ref(true)
const etapasError = ref<string | null>(null)

const carregarResumoEtapas = async () => {
  etapasLoading.value = true
  etapasError.value = null

  try {
    const { etapasResumo: resumo, atualizadoEm: atualizado } = await fetchEsteiraResumo(
      buildDashboardFilters(),
    )
    etapasResumo.value = resumo
    etapasAtualizadoEm.value = atualizado
  } catch (error: any) {
    console.error('Erro ao carregar dados do resumo da esteira:', error)
    etapasError.value =
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      error?.message ||
      'Não foi possível carregar o resumo da esteira no momento.'
  } finally {
    etapasLoading.value = false
  }
}

const ultimaAtualizacao = computed(() => {
  if (!atualizadoEm.value) return null
  const data = new Date(atualizadoEm.value)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
})

const ultimaAtualizacaoResumo = computed(() => {
  if (!etapasAtualizadoEm.value) return null
  const data = new Date(etapasAtualizadoEm.value)
  if (Number.isNaN(data.getTime())) return null
  return data.toLocaleString('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
})

const coresStatus = {
  pendentes: 'bg-amber-500',
  emAndamento: 'bg-blue-500',
  concluidas: 'bg-emerald-500',
} as const

const formatarNumero = (valor: number) => valor.toLocaleString('pt-BR')

const formatarPercentual = (valor: number) =>
  valor.toLocaleString('pt-BR', {
    minimumFractionDigits: valor > 0 && valor < 1 ? 1 : 0,
    maximumFractionDigits: 1,
  }) + '%'

const resumoCards = computed(() => {
  if (!etapasResumo.value) return []

  return [
    {
      chave: 'pendentes',
      titulo: 'Pendências',
      valor: etapasResumo.value.pendentes,
      percentual: etapasResumo.value.percentuais.pendentes,
      classeCor: coresStatus.pendentes,
      descricao: 'Quantidade de etapas aguardando início ou atribuição.',
      icone: '⏳',
    },
    {
      chave: 'emAndamento',
      titulo: 'Em andamento',
      valor: etapasResumo.value.emAndamento,
      percentual: etapasResumo.value.percentuais.emAndamento,
      classeCor: coresStatus.emAndamento,
      descricao: 'Etapas com responsáveis atuando ativamente.',
      icone: '🚧',
    },
    {
      chave: 'concluidas',
      titulo: 'Concluídas',
      valor: etapasResumo.value.concluidas,
      percentual: etapasResumo.value.percentuais.concluidas,
      classeCor: coresStatus.concluidas,
      descricao: 'Etapas finalizadas com sucesso na esteira.',
      icone: '✅',
    },
  ]
})

const resumoChartOptions = computed(() => {
  const total = etapasResumo.value?.total ?? 0

  return {
    labels: ['Pendentes', 'Em andamento', 'Concluídas'],
    colors: ['#f59e0b', '#3b82f6', '#22c55e'],
    chart: {
      type: 'pie',
      toolbar: { show: false },
      fontFamily: 'Outfit, sans-serif',
    },
    dataLabels: {
      formatter: (valor: number) => formatarPercentual(valor),
    },
    legend: {
      position: 'bottom',
      horizontalAlign: 'center',
      fontFamily: 'Outfit, sans-serif',
      labels: {
        colors: undefined,
      },
    },
    tooltip: {
      y: {
        formatter: (valor: number) => {
          const percentual = total > 0 ? (valor / total) * 100 : 0
          return `${formatarNumero(valor)} etapas (${formatarPercentual(percentual)})`
        },
      },
    },
  }
})

const resumoChartSeries = computed(() => {
  if (!etapasResumo.value) return []

  return [
    etapasResumo.value.pendentes,
    etapasResumo.value.emAndamento,
    etapasResumo.value.concluidas,
  ]
})

const FILTER_OPTIONS = [6, 12] as const
const filtroOptions = ref<number[]>([...FILTER_OPTIONS])
const selectedWeeks = ref<number>(FILTER_OPTIONS[1])
const fluxoLoading = ref(false)
const fluxoError = ref<string | null>(null)
const fluxoSemanal = ref<FluxoSemanalResponse['fluxoSemanal']>({
  labels: [],
  series: {
    criadas: [],
    concluidas: [],
  },
})
const fluxoPeriodo = ref<FluxoSemanalResponse['periodo'] | null>(null)

const atualizandoDashboard = computed(
  () =>
    procedimentosLoading.value ||
    etapasLoading.value ||
    statusLoading.value ||
    fluxoLoading.value,
)

const resetFluxoSemanal = () => {
  fluxoSemanal.value = {
    labels: [],
    series: {
      criadas: [],
      concluidas: [],
    },
  }
}

const carregarFluxoSemanal = async () => {
  fluxoLoading.value = true
  fluxoError.value = null

  if (filtros.dataInicio && filtros.dataFim && filtros.dataInicio > filtros.dataFim) {
    fluxoLoading.value = false
    fluxoError.value = 'Ajuste o intervalo de datas para visualizar o fluxo semanal.'
    resetFluxoSemanal()
    fluxoPeriodo.value = null
    return
  }

  try {
    const data = await fetchFluxoSemanal(selectedWeeks.value, buildDashboardFilters())
    filtroOptions.value = Array.isArray(data.filtrosDisponiveis) && data.filtrosDisponiveis.length
      ? data.filtrosDisponiveis
      : [...FILTER_OPTIONS]
    fluxoSemanal.value = {
      labels: Array.isArray(data.fluxoSemanal?.labels) ? data.fluxoSemanal.labels : [],
      series: {
        criadas: Array.isArray(data.fluxoSemanal?.series?.criadas)
          ? data.fluxoSemanal.series.criadas
          : [],
        concluidas: Array.isArray(data.fluxoSemanal?.series?.concluidas)
          ? data.fluxoSemanal.series.concluidas
          : [],
      },
    }
    fluxoPeriodo.value = data.periodo ?? null
  } catch (error: any) {
    console.error('Erro ao carregar fluxo semanal da esteira:', error)
    fluxoError.value =
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      error?.message ||
      'Não foi possível carregar os dados do fluxo semanal.'
    resetFluxoSemanal()
    fluxoPeriodo.value = null
  } finally {
    fluxoLoading.value = false
  }
}

watch(selectedWeeks, () => {
  void carregarFluxoSemanal()
})

const temFluxoDados = computed(() => {
  if (fluxoSemanal.value.labels.length === 0) {
    return false
  }

  return fluxoSemanal.value.series.criadas.some((valor) => valor > 0) ||
    fluxoSemanal.value.series.concluidas.some((valor) => valor > 0)
})

const formatTooltipValue = (value?: number) => {
  if (typeof value !== 'number') {
    return ''
  }

  return new Intl.NumberFormat('pt-BR').format(value)
}

const solicitacoesSemanaisChartOptions = computed(() => ({
  chart: {
    type: 'bar',
    toolbar: { show: false },
    fontFamily: 'Outfit, sans-serif',
  },
  colors: ['#6366F1'],
  plotOptions: {
    bar: {
      horizontal: false,
      columnWidth: '45%',
      borderRadius: 8,
      borderRadiusApplication: 'end',
    },
  },
  dataLabels: {
    enabled: false,
  },
  xaxis: {
    categories: solicitacoesSemanaisCategorias.value,
    axisBorder: { show: false },
    axisTicks: { show: false },
    labels: {
      style: {
        colors: undefined,
      },
    },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    labels: {
      formatter: (valor: number) => formatTooltipValue(Math.max(valor, 0)),
    },
  },
  grid: {
    borderColor: '#e5e7eb',
    strokeDashArray: 4,
  },
  tooltip: {
    y: {
      formatter: (valor?: number) => formatTooltipValue(valor),
    },
  },
  responsive: [
    {
      breakpoint: 768,
      options: {
        plotOptions: {
          bar: {
            columnWidth: '55%',
          },
        },
      },
    },
  ],
}))

const fluxoChartSeries = computed(() => [
  {
    name: 'Criadas',
    data: fluxoSemanal.value.series.criadas,
  },
  {
    name: 'Concluídas',
    data: fluxoSemanal.value.series.concluidas,
  },
])

const fluxoChartOptions = computed(() => ({
  chart: {
    fontFamily: 'Outfit, sans-serif',
    type: 'area',
    toolbar: { show: false },
  },
  colors: ['#2563EB', '#16A34A'],
  dataLabels: { enabled: false },
  stroke: {
    curve: 'smooth',
    width: 3,
  },
  fill: {
    type: 'gradient',
    gradient: {
      shadeIntensity: 1,
      opacityFrom: 0.35,
      opacityTo: 0.05,
      stops: [0, 90, 100],
    },
  },
  grid: {
    strokeDashArray: 4,
  },
  xaxis: {
    type: 'category',
    categories: fluxoSemanal.value.labels,
    labels: {
      rotate: -45,
    },
    axisBorder: { show: false },
    axisTicks: { show: false },
  },
  yaxis: {
    min: 0,
    forceNiceScale: true,
    labels: {
      formatter: (value: number) => formatTooltipValue(Math.max(value, 0)),
    },
  },
  tooltip: {
    shared: true,
    intersect: false,
    y: {
      formatter: (value?: number) => formatTooltipValue(value),
    },
  },
  legend: {
    position: 'top',
    horizontalAlign: 'left',
  },
}))

const STATUS_SOLICITACAO = {
  PENDENTE: 'PENDENTE',
  EM_ANDAMENTO: 'EM_ANDAMENTO',
  AGENDADA: 'AGENDADA',
  CANCELADA: 'CANCELADA',
  CONCLUIDO: 'CONCLUIDO',
} as const

type StatusChave = (typeof STATUS_SOLICITACAO)[keyof typeof STATUS_SOLICITACAO]

type StatusResumo = Record<StatusChave, number>

const STATUS_ORDER: readonly StatusChave[] = [
  STATUS_SOLICITACAO.PENDENTE,
  STATUS_SOLICITACAO.EM_ANDAMENTO,
  STATUS_SOLICITACAO.AGENDADA,
  STATUS_SOLICITACAO.CANCELADA,
  STATUS_SOLICITACAO.CONCLUIDO,
]

const STATUS_ROTULOS: Record<StatusChave, string> = {
  [STATUS_SOLICITACAO.PENDENTE]: 'Pendente',
  [STATUS_SOLICITACAO.EM_ANDAMENTO]: 'Em Andamento',
  [STATUS_SOLICITACAO.AGENDADA]: 'Agendada',
  [STATUS_SOLICITACAO.CANCELADA]: 'Cancelada',
  [STATUS_SOLICITACAO.CONCLUIDO]: 'Concluída',
}

const STATUS_CORES: Record<StatusChave, string> = {
  [STATUS_SOLICITACAO.PENDENTE]: '#FBBF24',
  [STATUS_SOLICITACAO.EM_ANDAMENTO]: '#3B82F6',
  [STATUS_SOLICITACAO.AGENDADA]: '#0EA5E9',
  [STATUS_SOLICITACAO.CANCELADA]: '#EF4444',
  [STATUS_SOLICITACAO.CONCLUIDO]: '#10B981',
}

const statusResumo = ref<StatusResumo>(criarResumoPadrao())
const statusLoading = ref(true)
const statusError = ref<string | null>(null)

function criarResumoPadrao(): StatusResumo {
  return STATUS_ORDER.reduce((acc, status) => {
    acc[status] = 0
    return acc
  }, {} as StatusResumo)
}

function normalizarStatusChave(valor: unknown): StatusChave | null {
  if (typeof valor !== 'string') {
    return null
  }

  const normalizado = valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\w]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase()

  if ((STATUS_ORDER as readonly string[]).includes(normalizado)) {
    return normalizado as StatusChave
  }

  if (normalizado === 'CONCLUIDA') {
    return STATUS_SOLICITACAO.CONCLUIDO
  }

  return null
}

const carregarStatusResumo = async () => {
  statusLoading.value = true
  statusError.value = null

  try {
    const { statusResumo: recebido } = await fetchStatusResumo(buildDashboardFilters())
    const resumoPadrao = criarResumoPadrao()

    if (recebido && typeof recebido === 'object') {
      Object.entries(recebido as Record<string, unknown>).forEach(([chave, valor]) => {
        const statusNormalizado = normalizarStatusChave(chave)
        if (!statusNormalizado) {
          return
        }

        const quantidade = Number(valor)
        resumoPadrao[statusNormalizado] = Number.isFinite(quantidade) ? quantidade : 0
      })
    }

    statusResumo.value = resumoPadrao
  } catch (error: any) {
    console.error('Erro ao carregar resumo da esteira cirúrgica', error)
    statusError.value =
      error?.response?.data?.error ||
      error?.response?.data?.mensagem ||
      error?.message ||
      'Não foi possível carregar o resumo da esteira.'
  } finally {
    statusLoading.value = false
  }
}

const statusLista = computed(() =>
  STATUS_ORDER.map((status) => ({
    chave: status,
    rotulo: STATUS_ROTULOS[status],
    total: statusResumo.value[status] ?? 0,
    cor: STATUS_CORES[status],
  })),
)

const statusChartSeries = computed(() => statusLista.value.map((item) => item.total))

const totalStatusSolicitacoes = computed(() =>
  statusChartSeries.value.reduce((acc, quantidade) => acc + quantidade, 0),
)

const statusChartOptions = computed(() => ({
  chart: {
    type: 'donut',
    toolbar: { show: false },
    fontFamily: 'Inter, sans-serif',
  },
  labels: statusLista.value.map((item) => item.rotulo),
  colors: statusLista.value.map((item) => item.cor),
  legend: {
    position: 'bottom',
    fontSize: '14px',
    markers: {
      width: 12,
      height: 12,
      radius: 12,
    },
    itemMargin: {
      horizontal: 8,
      vertical: 4,
    },
  },
  plotOptions: {
    pie: {
      donut: {
        size: '70%',
        labels: {
          show: true,
          value: {
            formatter: (val: string) => Number(val).toLocaleString('pt-BR'),
          },
          total: {
            show: true,
            label: 'Total',
            formatter: () => totalStatusSolicitacoes.value.toLocaleString('pt-BR'),
          },
        },
      },
    },
  },
  dataLabels: {
    style: {
      fontSize: '12px',
      fontWeight: '500',
    },
  },
  stroke: {
    width: 0,
  },
  responsive: [
    {
      breakpoint: 640,
      options: {
        chart: { height: 280 },
        legend: { position: 'bottom' },
      },
    },
  ],
}))

const atualizarDashboard = async () => {
  if (!validarFiltros()) {
    return
  }

  await Promise.all([
    carregarProcedimentosDashboard(),
    carregarResumoEtapas(),
    carregarStatusResumo(),
  ])

  await carregarFluxoSemanal()
}

onMounted(() => {
  void atualizarDashboard()
})
</script>
