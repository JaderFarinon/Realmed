<template>
  <AdminLayout>
    <div class="space-y-6 p-6">
      <section class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">{{ route.meta.title }}</h1>
          <p class="mt-1 max-w-3xl text-sm text-gray-600 dark:text-gray-300">
            Monitore as evoluções médicas registradas no RISC e identifique fichas com possível indicação cirúrgica
            utilizando as palavras-chave configuradas nos parâmetros do sistema.
          </p>

          <div v-if="config.palavras.length" class="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span class="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Palavras monitoradas:
            </span>
            <span
              v-for="termo in config.palavras"
              :key="`palavra-${termo}`"
              class="rounded-full bg-brand-500/10 px-3 py-1 font-medium text-brand-600 dark:bg-brand-400/20 dark:text-brand-100"
            >
              {{ termo }}
            </span>
          </div>

          <div v-if="config.excluir.length" class="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span class="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
              Ignorar quando contiver:
            </span>
            <span
              v-for="termo in config.excluir"
              :key="`excluir-${termo}`"
              class="rounded-full bg-red-500/10 px-3 py-1 font-medium text-red-600 dark:bg-red-400/20 dark:text-red-200"
            >
              {{ termo }}
            </span>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 self-stretch sm:flex-row">
          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-brand-500 bg-white px-4 py-2 text-sm font-medium text-brand-600 transition hover:bg-brand-500/10 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 dark:border-brand-400 dark:bg-gray-900 dark:text-brand-200 dark:hover:bg-brand-400/20 dark:focus:ring-brand-300 dark:focus:ring-offset-gray-950"
            :disabled="carregando"
            @click="carregarRadar(true)"
          >
            <svg class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24">
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M4.5 12a7.5 7.5 0 0114.819-1.5M19.5 12a7.5 7.5 0 01-14.819 1.5M4.5 12H2.25m19.5 0H19.5"
              />
            </svg>
            Atualizar
          </button>
        </div>
      </section>

      <section class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60">
        <form class="grid gap-4 md:grid-cols-6" @submit.prevent="aplicarFiltros">
          <div class="md:col-span-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Paciente</label>
            <input
              v-model="filtros.paciente"
              type="text"
              placeholder="Nome ou parte do nome"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div class="md:col-span-2">
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Médico</label>
            <input
              v-model="filtros.medico"
              type="text"
              placeholder="Nome ou código"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Ficha</label>
            <input
              v-model="filtros.ficha"
              type="text"
              placeholder="Número da ficha"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Palavra</label>
            <input
              v-model="filtros.palavra"
              type="text"
              placeholder="Palavra específica"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">CID</label>
            <input
              v-model="filtros.cid"
              type="text"
              placeholder="Código CID"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div>
            <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">Período (dias)</label>
            <input
              v-model.number="filtros.dias"
              type="number"
              min="1"
              :placeholder="config.periodoDias ? String(config.periodoDias) : 'Período em dias'"
              class="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-300/50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            />
          </div>

          <div class="md:col-span-6 flex flex-wrap gap-3">
            <button
              type="submit"
              class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 dark:bg-brand-400 dark:text-gray-900 dark:hover:bg-brand-300"
              :disabled="carregando"
            >
              Aplicar filtros
            </button>
            <button
              type="button"
              class="inline-flex items-center justify-center rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-brand-200 focus:ring-offset-2 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              :disabled="carregando"
              @click="limparFiltros"
            >
              Limpar
            </button>
          </div>
        </form>
      </section>

      <section class="space-y-4">
        <div
          v-if="erro"
          class="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-400/60 dark:bg-red-950/40 dark:text-red-200"
        >
          {{ erro }}
        </div>

        <div v-if="carregando" class="space-y-4">
          <div
            v-for="index in 3"
            :key="`skeleton-${index}`"
            class="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
          >
            <div class="h-5 w-52 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div class="mt-4 space-y-2">
              <div class="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div class="h-4 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              <div class="h-4 w-10/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            </div>
          </div>
        </div>

        <div
          v-else-if="!resultados.length"
          class="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center text-sm text-gray-500 shadow-sm dark:border-gray-700 dark:bg-gray-900/60 dark:text-gray-300"
        >
          <p v-if="!config.palavras.length">
            Nenhuma palavra-chave foi configurada para o radar. Cadastre os termos em <strong>Cadastros → Parâmetros</strong>
            para iniciar a análise.
          </p>
          <p v-else>Não foram encontradas evoluções que atendam aos filtros e parâmetros informados.</p>
        </div>

        <div v-else class="space-y-4">
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600 dark:text-gray-300">
            <span>
              Exibindo
              <strong>{{ totalFichas }}</strong>
              ficha{{ totalFichas === 1 ? '' : 's' }} com
              <strong>{{ totalEvolucoes }}</strong>
              evolução{{ totalEvolucoes === 1 ? '' : 'es' }} relevante{{ totalEvolucoes === 1 ? '' : 's' }}.
            </span>
            <span v-if="filtros.dias">
              Período analisado: últimos <strong>{{ filtros.dias }}</strong> dias.
            </span>
          </div>

          <div
            v-for="paciente in resultados"
            :key="`paciente-${paciente.ficha}`"
            class="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900/60"
          >
            <header class="flex flex-col gap-2 border-b border-gray-200 bg-gray-50 px-6 py-4 dark:border-gray-700 dark:bg-gray-900/80 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-800 dark:text-white">
                  {{ paciente.paciente.nome || 'Paciente não identificado' }}
                </h2>
                <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  <span class="mr-3">Ficha: <strong>{{ paciente.ficha }}</strong></span>
                  <span>CPF: <strong>{{ formatarCpf(paciente.paciente.cpf) }}</strong></span>
                </div>
              </div>
              <div class="text-xs text-gray-500 dark:text-gray-400">
                {{ paciente.evolucoes.length }} evolução{{ paciente.evolucoes.length === 1 ? '' : 'es' }} relevante{{ paciente.evolucoes.length === 1 ? '' : 's' }}
              </div>
            </header>

            <div class="divide-y divide-gray-200 dark:divide-gray-800">
              <article
                v-for="evolucao in paciente.evolucoes"
                :key="`evolucao-${paciente.ficha}-${evolucao.id}`"
                class="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-start sm:justify-between"
              >
                <div class="flex-1">
                  <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                    <span class="font-semibold text-gray-700 dark:text-gray-200">
                      {{ formatarData(evolucao.data) }}
                      <template v-if="evolucao.hora">às {{ evolucao.hora }}</template>
                    </span>
                    <span v-if="evolucao.medico.nome">
                      Médico: <strong>{{ evolucao.medico.nome }}</strong>
                      <template v-if="evolucao.medico.codigo"> ({{ evolucao.medico.codigo }})</template>
                    </span>
                    <span v-if="evolucao.cid">CID: <strong>{{ evolucao.cid }}</strong></span>
                  </div>

                  <div
                    class="prose prose-sm mt-3 max-w-none text-gray-700 dark:prose-invert dark:text-gray-200"
                    v-html="destacarTexto(evolucao.texto, evolucao.palavrasEncontradas)"
                  />

                  <div
                    v-if="evolucao.palavrasEncontradas.length"
                    class="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-brand-600 dark:text-brand-200"
                  >
                    <span class="font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                      Palavras encontradas:
                    </span>
                    <span
                      v-for="match in evolucao.palavrasEncontradas"
                      :key="`match-${paciente.ficha}-${evolucao.id}-${match.term}`"
                      class="rounded-full bg-brand-500/10 px-2 py-1 font-medium dark:bg-brand-500/20"
                    >
                      {{ match.term }}
                    </span>
                  </div>
                </div>

                <div class="flex shrink-0 flex-col items-end gap-2">
                  <button
                    type="button"
                    class="inline-flex items-center justify-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2 dark:bg-brand-400 dark:text-gray-900 dark:hover:bg-brand-300"
                    @click="abrirSolicitacao(paciente, evolucao)"
                  >
                    Gerar Solicitação
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </section>
    </div>

    <ModelSolicitacaoCirurgia
      :isOpen="modalAberto"
      :dados="solicitacaoContexto"
      @close="fecharModalSolicitacao"
      @saved="onSolicitacaoSalva"
    />
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'
import AdminLayout from '@/components/layout/AdminLayout.vue'
import ModelSolicitacaoCirurgia from '@/components/forms/surgical-request/ModelSolicitacaoCirurgia.vue'
import type {
  RadarEvolucaoMatch,
  RadarEvolucaoRegistro,
  RadarEvolucoesResponse,
  RadarPacienteResumo,
} from '@/types/radarEvolucoes'
import { fetchRadarEvolucoes } from '@/services/radarEvolucoes'

const route = useRoute()

const resposta = ref<RadarEvolucoesResponse | null>(null)
const carregando = ref(false)
const erro = ref('')

const filtros = reactive({
  paciente: '',
  medico: '',
  ficha: '',
  palavra: '',
  cid: '',
  dias: null as number | null,
})

const config = computed(() => resposta.value?.config ?? { palavras: [], excluir: [], periodoDias: filtros.dias ?? 90 })
const resultados = computed<RadarPacienteResumo[]>(() => resposta.value?.resultados ?? [])
const totalFichas = computed(() => resposta.value?.totalFichas ?? resultados.value.length)
const totalEvolucoes = computed(() => resposta.value?.totalEvolucoes ?? resultados.value.reduce((total, item) => total + item.evolucoes.length, 0))

const modalAberto = ref(false)
const solicitacaoContexto = ref<Record<string, unknown> | null>(null)

const escapeHtml = (valor: string) =>
  valor
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const destacarTexto = (texto: string, matches: RadarEvolucaoMatch[]) => {
  if (!matches?.length) {
    return escapeHtml(texto).replace(/\n/g, '<br />')
  }

  const posicoes = matches
    .flatMap((match) => match.positions)
    .filter((posicao) => Number.isFinite(posicao.start) && Number.isFinite(posicao.end))
    .map((posicao) => ({
      start: Math.max(0, Math.floor(posicao.start)),
      end: Math.max(0, Math.floor(posicao.end)),
    }))
    .sort((a, b) => (a.start - b.start) || (b.end - a.end))

  let cursor = 0
  let resultado = ''

  for (const pos of posicoes) {
    let inicio = Math.min(Math.max(pos.start, 0), texto.length)
    const fim = Math.min(Math.max(pos.end, 0), texto.length)

    if (fim <= inicio) {
      continue
    }

    if (inicio < cursor) {
      inicio = cursor
    }

    if (fim <= inicio) {
      continue
    }

    if (inicio > cursor) {
      resultado += escapeHtml(texto.slice(cursor, inicio))
    }

    resultado += `<mark class="rounded bg-yellow-200 px-1 text-gray-900 dark:bg-yellow-400/30 dark:text-yellow-100">${escapeHtml(texto.slice(inicio, fim))}</mark>`
    cursor = fim
  }

  if (cursor < texto.length) {
    resultado += escapeHtml(texto.slice(cursor))
  }

  return resultado.replace(/\n/g, '<br />') || '&nbsp;'
}

const formatarData = (data: string | null) => {
  if (!data) {
    return '-'
  }

  const partes = data.split('-')
  if (partes.length === 3) {
    return `${partes[2].padStart(2, '0')}/${partes[1].padStart(2, '0')}/${partes[0]}`
  }

  return data
}

const formatarCpf = (valor: string | null) => {
  if (!valor) {
    return '-'
  }

  const digitos = valor.replace(/\D/g, '')
  if (digitos.length !== 11) {
    return valor
  }

  return digitos.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
}

const carregarRadar = async (manterPeriodo = false) => {
  carregando.value = true
  erro.value = ''

  try {
    const diasFiltro = typeof filtros.dias === 'number' && Number.isFinite(filtros.dias)
      ? filtros.dias
      : undefined

    const consulta = {
      paciente: filtros.paciente || undefined,
      medico: filtros.medico || undefined,
      ficha: filtros.ficha || undefined,
      palavra: filtros.palavra || undefined,
      cid: filtros.cid || undefined,
      dias: diasFiltro,
    }

    const data = await fetchRadarEvolucoes(consulta)
    resposta.value = data

    const diasAtual = typeof filtros.dias === 'number' && Number.isFinite(filtros.dias)
      ? filtros.dias
      : null

    if (!manterPeriodo || diasAtual === null || diasAtual <= 0) {
      filtros.dias = data.config?.periodoDias ?? null
    }
  } catch (error: any) {
    console.error('Erro ao carregar radar de evoluções', error)
    const mensagem = error?.response?.data?.error || 'Não foi possível carregar o radar de evoluções.'
    erro.value = mensagem
  } finally {
    carregando.value = false
  }
}

const aplicarFiltros = () => {
  carregarRadar(true)
}

const limparFiltros = () => {
  filtros.paciente = ''
  filtros.medico = ''
  filtros.ficha = ''
  filtros.palavra = ''
  filtros.cid = ''
  filtros.dias = config.value.periodoDias ?? null
  carregarRadar(true)
}

const abrirSolicitacao = (paciente: RadarPacienteResumo, evolucao: RadarEvolucaoRegistro) => {
  const dados: Record<string, unknown> = {
    nome_paciente: paciente.paciente.nome || '',
    paciente_integracao_codigo: paciente.ficha,
    paciente_integracao_origem: 'integracao',
    medico: evolucao.medico.nome || '',
    medico_integracao_codigo: evolucao.medico.codigo || '',
    medico_integracao_origem: evolucao.medico.codigo ? 'integracao' : '',
    observacoes: evolucao.texto,
  }

  if (evolucao.cid) {
    dados.cid = evolucao.cid
  }

  solicitacaoContexto.value = dados
  modalAberto.value = true
}

const fecharModalSolicitacao = () => {
  modalAberto.value = false
  solicitacaoContexto.value = null
}

const onSolicitacaoSalva = async () => {
  await carregarRadar(true)
  fecharModalSolicitacao()
}

onMounted(() => {
  carregarRadar(false)
})
</script>
