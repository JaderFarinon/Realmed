<template>
  <Modal v-if="isOpen" @close="emit('close', false)">
    <template #body>
      <div
        class="no-scrollbar relative w-full max-w-[720px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-8"
      >
        <h2 class="mb-4 text-xl font-semibold text-gray-800 dark:text-white/90">
          {{ dados?.id ? 'Editar Etapa' : 'Nova Etapa' }}
        </h2>
        <form @submit.prevent="salvar" class="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div class="md:col-span-2">
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Convênios</label>
            <div ref="conveniosWrapper" class="relative">
              <div
                class="dark:bg-dark-900 flex min-h-11 w-full flex-wrap items-center gap-2 rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus-within:border-brand-300 focus-within:outline-hidden focus-within:ring-3 focus-within:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus-within:border-brand-800"
                @click="abrirLista"
              >
                <template v-if="todosConveniosSelecionados">
                  <span
                    class="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    Todos
                  </span>
                </template>
                <template v-else-if="excedeuLimiteExibicaoConvenios">
                  <span
                    class="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    Mais de 20...
                  </span>
                </template>
                <template v-else>
                  <span
                    v-for="convenio in selectedConvenios"
                    :key="`conv-${convenio.id}`"
                    class="flex items-center gap-1 rounded-full bg-brand-100 px-2 py-1 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-200"
                  >
                    {{ convenio.nomeExibicao }}
                    <button
                      type="button"
                      class="leading-none text-brand-700 hover:text-brand-900 dark:text-brand-200"
                      @click.stop="removerConvenio(convenio.id)"
                    >
                      &times;
                    </button>
                  </span>
                </template>
                <input
                  ref="searchInput"
                  v-model="searchTerm"
                  type="text"
                  placeholder="Digite para buscar convênios"
                  class="flex-1 border-none bg-transparent py-1 text-sm text-gray-800 focus:outline-hidden dark:text-white/90"
                  @focus="abrirLista"
                  @input="aoDigitar"
                />
              </div>
              <ul
                v-if="dropdownAberto"
                class="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <li
                  v-if="estaCarregandoConvenios"
                  class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  Buscando convênios...
                </li>
                <template v-else>
                  <li
                    v-if="podeSelecionarTodosConvenios && convenios.length"
                    class="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-2 text-xs font-medium uppercase tracking-wide text-gray-500 dark:border-gray-700 dark:text-gray-400"
                  >
                    <span>Selecionar todos</span>
                    <div class="flex items-center gap-2">
                      <button
                        type="button"
                        class="rounded-full border border-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 transition hover:bg-brand-50 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10 dark:disabled:border-gray-600 dark:disabled:text-gray-500"
                        :disabled="todosConveniosSelecionados"
                        @mousedown.prevent="selecionarTodosConvenios"
                      >
                        Marcar Todos
                      </button>
                      <button
                        type="button"
                        class="rounded-full border border-brand-500 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-brand-600 transition hover:bg-brand-50 focus:outline-hidden focus:ring-2 focus:ring-brand-500/40 disabled:border-gray-300 disabled:text-gray-400 disabled:hover:bg-transparent dark:border-brand-400 dark:text-brand-300 dark:hover:bg-brand-500/10 dark:disabled:border-gray-600 dark:disabled:text-gray-500"
                        :disabled="!form.convenio_ids.length"
                        @mousedown.prevent="desmarcarTodosConvenios"
                      >
                        Desmarcar Todos
                      </button>
                    </div>
                  </li>
                <li
                  v-for="item in convenios"
                  :key="item.id"
                  class="flex cursor-pointer items-center justify-between gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-700"
                  :class="form.convenio_ids.includes(item.id) ? 'bg-brand-50 dark:bg-brand-500/20' : ''"
                  @mousedown.prevent="selecionarConvenio(item)"
                >
                  <div>
                    <p class="font-medium">{{ item.nomeExibicao }}</p>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ item.registro_ans ? `ANS: ${item.registro_ans}` : 'Sem registro ANS' }}
                    </p>
                  </div>
                    <span
                      class="flex h-5 w-5 items-center justify-center rounded-full border"
                      :class="form.convenio_ids.includes(item.id)
                        ? 'border-brand-500 bg-brand-500 text-white'
                        : 'border-gray-300 text-gray-400 dark:border-gray-600'
                      "
                    >
                      ✓
                    </span>
                  </li>
                  <li
                    v-if="convenios.length === 0"
                    class="px-4 py-2 text-sm text-gray-500 dark:text-gray-400"
                  >
                    Nenhum convênio encontrado
                  </li>
                </template>
              </ul>
            </div>
            <p
              v-if="!configuracao.suportaMultiplosConvenios"
              class="mt-2 text-xs text-gray-500 dark:text-gray-400"
            >
              A base de dados atual permite vincular apenas um convênio por etapa.
            </p>
            <div
              v-if="informacoesIntegracao.length"
              class="mt-2 space-y-1 text-xs text-gray-500 dark:text-gray-400"
            >
              <p v-for="(info, index) in informacoesIntegracao" :key="`info-${index}`">{{ info }}</p>
            </div>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Tipos de Procedimento</label>
            <div
              class="max-h-56 space-y-2 overflow-y-auto rounded-lg border border-gray-300 bg-transparent px-4 py-3 text-sm shadow-theme-xs dark:border-gray-700 dark:bg-gray-900"
            >
              <p
                v-if="!configuracao.suportaMultiplosTipos"
                class="text-xs text-gray-500 dark:text-gray-400"
              >
                A base de dados atual permite selecionar apenas um tipo de procedimento por etapa.
              </p>
              <template v-if="tipos.length">
                <label
                  v-for="tipo in tipos"
                  :key="tipo.id"
                  class="flex items-center justify-between gap-3 text-gray-700 dark:text-gray-200"
                >
                  <div>
                    <span>{{ tipo.nome }}</span>
                    <span v-if="!tipo.ativo" class="ml-1 text-xs text-red-500">(inativo)</span>
                  </div>
                  <input
                    type="checkbox"
                    :value="tipo.id"
                    :checked="estaTipoSelecionado(tipo.id)"
                    :disabled="!tipo.ativo && !estaTipoSelecionado(tipo.id)"
                    class="h-4 w-4 rounded border-gray-300 text-brand-500 focus:ring-brand-500"
                    @change="alternarTipo(tipo.id, ($event.target as HTMLInputElement).checked)"
                  />
                </label>
              </template>
            <p v-else class="text-xs text-gray-500 dark:text-gray-400">Nenhum tipo cadastrado.</p>
          </div>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Filha de:</label>
          <select
            :value="form.depende_de_id === null ? '' : String(form.depende_de_id)"
            class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:focus:border-brand-800"
            :disabled="carregandoEtapasDependencia && !etapasParaSelecao.length"
            @change="atualizarDependencia(($event.target as HTMLSelectElement).value)"
          >
            <option value="">
              {{
                carregandoEtapasDependencia
                  ? 'Carregando etapas...'
                  : 'Nenhuma (etapa independente)'
              }}
            </option>
            <option
              v-for="etapa in etapasParaSelecao"
              :key="`dependencia-${etapa.id}`"
              :value="String(etapa.id)"
            >
              {{ etapa.nome }}
            </option>
          </select>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Escolha a etapa que deve ser concluída antes desta. Deixe em branco para etapas independentes.
          </p>
        </div>

        <div>
          <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Nome da Etapa</label>
          <input
            v-model="form.nome"
            type="text"
              required
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
            />
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Sequência</label>
            <input
              :value="form.sequencia ?? ''"
              type="number"
              min="0"
              step="1"
              placeholder="Defina a ordem exibida no Kanban"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              @input="atualizarSequencia(($event.target as HTMLInputElement).value)"
              @blur="sanitizarSequencia"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Sequências menores aparecem primeiro no Kanban e na linha do tempo da cirurgia.
            </p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Dias previstos</label>
            <input
              :value="form.dias_previstos ?? ''"
              type="number"
              min="0"
              step="1"
              placeholder="Informe a previsão ou deixe em branco"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              @input="atualizarDiasPrevistos(($event.target as HTMLInputElement).value)"
              @blur="sanitizarDiasPrevistos"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Deixe em branco quando a etapa não tiver prazo previsto.</p>
          </div>

          <div>
            <label class="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-400">Mínimo de anexos</label>
            <input
              v-model.number="form.minimo_anexos"
              type="number"
              min="0"
              step="1"
              class="dark:bg-dark-900 h-11 w-full rounded-lg border border-gray-300 bg-transparent px-4 py-2.5 text-sm text-gray-800 shadow-theme-xs placeholder:text-gray-400 focus:border-brand-300 focus:outline-hidden focus:ring-3 focus:ring-brand-500/10 dark:border-gray-700 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 dark:focus:border-brand-800"
              @blur="sanitizarMinimoAnexos"
            />
            <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">Informe 0 quando a etapa não exigir anexos obrigatórios.</p>
          </div>

          <div class="flex items-center gap-2 h-11 md:col-span-2">
            <input
              v-model="form.solicitar_data_limite"
              type="checkbox"
              id="etapa-solicitar-data-limite"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="etapa-solicitar-data-limite" class="text-sm text-gray-700 dark:text-gray-400">
              Informar data limite
            </label>
          </div>

          <div class="flex items-center gap-2 h-11 md:col-span-2">
            <input
              v-model="form.ativo"
              type="checkbox"
              id="etapa-ativa"
              class="h-5 w-5 text-brand-500 focus:ring-brand-500"
            />
            <label for="etapa-ativa" class="text-sm text-gray-700 dark:text-gray-400">Ativo</label>
          </div>

          <div class="flex justify-end gap-2 mt-4 md:col-span-2">
            <button
              type="button"
              @click="emit('close', false)"
              class="flex w-full justify-center rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] sm:w-auto"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="flex w-full justify-center rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:bg-brand-400 sm:w-auto"
              :disabled="!form.convenio_ids.length"
            >
              {{ dados?.id ? 'Atualizar' : 'Salvar' }}
            </button>
          </div>
        </form>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed, onMounted, onBeforeUnmount } from 'vue'
import api from '@/plugins/axios'
import Modal from '@/components/profile/Modal.vue'
import { buscarConveniosIntegrados, type ConvenioIntegrado } from '@/services/convenios'

interface TipoOption {
  id: number
  nome: string
  ativo: boolean
}

interface ConvenioOption {
  id: number
  nome: string
  nomeExibicao: string
  registro_ans?: string
}

interface ConvenioSelecionado extends ConvenioOption {
  referencia?: string | null
  usa_integracao?: boolean
}

interface EtapaForm {
  id?: number
  nome: string
  procedimento_tipo_ids: number[]
  convenio_ids: number[]
  ativo: boolean
  dias_previstos: number | null
  minimo_anexos: number
  solicitar_data_limite: boolean
  depende_de_id: number | null
  sequencia: number | null
}

interface EtapaDependenciaInfo {
  id: number
  nome: string | null
}

interface EtapaDetalhes extends EtapaForm {
  convenios?: ConvenioSelecionado[]
  depende_de?: EtapaDependenciaInfo | null
  ordem?: number | null
}

interface EtapaSelecaoOption {
  id: number
  nome: string
}

interface EtapaConfiguracao {
  modelo: 'novo' | 'antigo' | 'desconhecido'
  suportaMultiplosTipos: boolean
  suportaMultiplosConvenios: boolean
  maxTipos: number | null
  maxConvenios: number | null
}

const props = defineProps<{ isOpen: boolean; dados: EtapaDetalhes | null }>()
const emit = defineEmits(['close', 'sucesso', 'erro'])

const LIMITE_EXIBICAO_CONVENIOS = 20

const form = ref<EtapaForm>({
  nome: '',
  procedimento_tipo_ids: [],
  convenio_ids: [],
  ativo: true,
  dias_previstos: null,
  minimo_anexos: 0,
  solicitar_data_limite: false,
  depende_de_id: null,
  sequencia: null,
})
const tipos = ref<TipoOption[]>([])
const convenios = ref<ConvenioOption[]>([])
const selectedConvenios = ref<ConvenioSelecionado[]>([])
const searchInput = ref<HTMLInputElement | null>(null)
const searchTerm = ref('')
const dropdownAberto = ref(false)
const conveniosWrapper = ref<HTMLElement | null>(null)
const estaCarregandoConvenios = ref(false)
const etapasDependencia = ref<EtapaSelecaoOption[]>([])
const carregandoEtapasDependencia = ref(false)
const configuracaoPadrao: EtapaConfiguracao = {
  modelo: 'desconhecido',
  suportaMultiplosTipos: true,
  suportaMultiplosConvenios: true,
  maxTipos: null,
  maxConvenios: null,
}

const ordenarConveniosPorNome = (lista: ConvenioOption[]): ConvenioOption[] => {
  return lista
    .slice()
    .sort((a, b) => {
      const nomeA = (a.nome || '').trim()
      const nomeB = (b.nome || '').trim()

      if (!nomeA && !nomeB) return 0
      if (!nomeA) return 1
      if (!nomeB) return -1

      return nomeA.localeCompare(nomeB, 'pt-BR', { sensitivity: 'base' })
    })
}

const transformarConvenioIntegrado = (item: ConvenioIntegrado): ConvenioOption | null => {
  const nome = item.nome.trim()
  if (!nome) {
    return null
  }

  const idNumero = Number(item.id)
  if (!Number.isInteger(idNumero) || idNumero <= 0) {
    return null
  }

  return {
    id: idNumero,
    nome,
    nomeExibicao: `${nome} (${item.id})`,
    registro_ans: item.registro_ans ?? undefined,
  }
}
const configuracao = ref<EtapaConfiguracao>({ ...configuracaoPadrao })
const carregandoConfiguracao = ref(false)
const configuracaoCarregada = ref(false)
let debounceId: ReturnType<typeof setTimeout> | null = null

const normalizaIds = (valor: unknown): number[] => {
  if (!Array.isArray(valor)) return []
  const set = new Set<number>()
  valor.forEach((item) => {
    const numero = Number(item)
    if (Number.isInteger(numero) && numero > 0) {
      set.add(numero)
    }
  })
  return Array.from(set)
}

const normalizaLimite = (valor: unknown): number | null => {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) return null
  const inteiro = Math.trunc(numero)
  return inteiro > 0 ? inteiro : null
}

const obterLimite = (valor: number | null, suportaMultiplos: boolean): number | null => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    const inteiro = Math.trunc(valor)
    if (inteiro > 0) {
      return inteiro
    }
  }
  return suportaMultiplos ? null : 1
}

const normalizarDiasPrevistosValor = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return null
  }

  return Math.trunc(numero)
}

const normalizarMinimoAnexosValor = (valor: unknown): number => {
  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return 0
  }

  return Math.trunc(numero)
}

const normalizarSequenciaValor = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero) || numero < 0) {
    return null
  }

  return Math.trunc(numero)
}

const normalizarDependenciaValor = (valor: unknown): number | null => {
  if (valor === undefined || valor === null || valor === '') {
    return null
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero)) {
    return null
  }

  const inteiro = Math.trunc(numero)
  return inteiro > 0 ? inteiro : null
}

const sanitizarDiasPrevistos = () => {
  form.value.dias_previstos = normalizarDiasPrevistosValor(form.value.dias_previstos)
}

const sanitizarMinimoAnexos = () => {
  form.value.minimo_anexos = normalizarMinimoAnexosValor(form.value.minimo_anexos)
}

const sanitizarSequencia = () => {
  form.value.sequencia = normalizarSequenciaValor(form.value.sequencia)
}

const atualizarDiasPrevistos = (valor: string) => {
  if (valor === '') {
    form.value.dias_previstos = null
    return
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero)) {
    form.value.dias_previstos = null
    return
  }

  form.value.dias_previstos = numero
}

const atualizarSequencia = (valor: string) => {
  if (valor === '') {
    form.value.sequencia = null
    return
  }

  const numero = Number(valor)
  if (!Number.isFinite(numero) || Number.isNaN(numero)) {
    form.value.sequencia = null
    return
  }

  form.value.sequencia = numero
}

const aplicarLimites = () => {
  const limiteConvenios = obterLimite(configuracao.value.maxConvenios, configuracao.value.suportaMultiplosConvenios)
  const selecionadosAtuais = selectedConvenios.value.slice()
  const mapaSelecionados = new Map(selecionadosAtuais.map((item) => [item.id, item]))

  if (limiteConvenios !== null && form.value.convenio_ids.length > limiteConvenios) {
    form.value.convenio_ids = form.value.convenio_ids.slice(-limiteConvenios)
  }

  selectedConvenios.value = form.value.convenio_ids.map((id) => {
    const existente = mapaSelecionados.get(id)
    if (existente) return existente

    const infoLista = convenios.value.find((conv) => conv.id === id)
    return {
      id,
      nome: infoLista?.nome || 'Convênio selecionado',
      nomeExibicao: infoLista?.nomeExibicao || infoLista?.nome || 'Convênio selecionado',
      registro_ans: infoLista?.registro_ans,
      referencia: null,
      usa_integracao: false,
    }
  })

  const limiteTipos = obterLimite(configuracao.value.maxTipos, configuracao.value.suportaMultiplosTipos)
  if (limiteTipos !== null && form.value.procedimento_tipo_ids.length > limiteTipos) {
    form.value.procedimento_tipo_ids = form.value.procedimento_tipo_ids.slice(-limiteTipos)
  }
}

const limiteConvenios = computed(() => obterLimite(configuracao.value.maxConvenios, configuracao.value.suportaMultiplosConvenios))

const excedeuLimiteExibicaoConvenios = computed(
  () => selectedConvenios.value.length > LIMITE_EXIBICAO_CONVENIOS
)

const podeSelecionarTodosConvenios = computed(() => {
  const limite = limiteConvenios.value
  return limite === null || limite > 1
})

const todosConveniosSelecionados = computed(() => {
  if (!convenios.value.length) return false
  const idsSelecionados = new Set(form.value.convenio_ids)
  return convenios.value.every((item) => idsSelecionados.has(item.id))
})

const etapaDependenciaSelecionada = computed((): EtapaSelecaoOption | null => {
  const idSelecionado = form.value.depende_de_id
  if (idSelecionado === null) {
    return null
  }

  const existente = etapasDependencia.value.find((etapa) => etapa.id === idSelecionado)
  if (existente) {
    return existente
  }

  const dadosOriginais = props.dados?.depende_de ?? null
  if (!dadosOriginais) {
    return null
  }

  const idNormalizado = normalizarDependenciaValor(dadosOriginais.id)
  if (idNormalizado !== idSelecionado) {
    return null
  }

  const nomeBruto = typeof dadosOriginais.nome === 'string' ? dadosOriginais.nome : ''
  const nomeNormalizado = nomeBruto.trim().length ? nomeBruto.trim() : `Etapa ${idSelecionado}`

  return {
    id: idSelecionado,
    nome: nomeNormalizado,
  }
})

const etapasParaSelecao = computed(() => {
  const atualId = form.value.id ?? null
  const opcoes = etapasDependencia.value.filter((etapa) => etapa.id !== atualId)
  const selecionada = etapaDependenciaSelecionada.value

  if (!selecionada || selecionada.id === atualId) {
    return opcoes
  }

  const jaExiste = opcoes.some((etapa) => etapa.id === selecionada.id)
  return jaExiste ? opcoes : [...opcoes, selecionada]
})

const selecionarTodosConvenios = () => {
  if (!convenios.value.length) {
    return
  }

  const idsSelecionados = new Set(form.value.convenio_ids)
  convenios.value.forEach((item) => idsSelecionados.add(item.id))

  let novosIds = Array.from(idsSelecionados)
  const limite = limiteConvenios.value

  if (typeof limite === 'number' && limite > 0 && novosIds.length > limite) {
    novosIds = novosIds.slice(-limite)
  }

  form.value.convenio_ids = novosIds
  aplicarLimites()
}

const desmarcarTodosConvenios = () => {
  if (!form.value.convenio_ids.length && !selectedConvenios.value.length) {
    return
  }

  form.value.convenio_ids = []
  selectedConvenios.value = []
  aplicarLimites()
}

const carregarTipos = async () => {
  try {
    const response = await api.get('/procedimento-tipos')
    tipos.value = response.data
  } catch (err) {
    console.error('Erro ao carregar tipos de procedimento', err)
  }
}

const carregarConvenios = async (busca = '') => {
  try {
    estaCarregandoConvenios.value = true
    const lista = await buscarConveniosIntegrados({ termo: busca })
    const normalizados = lista
      .map((item) => transformarConvenioIntegrado(item))
      .filter((item): item is ConvenioOption => Boolean(item))
      .reduce<Map<number, ConvenioOption>>((mapa, item) => {
        if (!mapa.has(item.id)) {
          mapa.set(item.id, item)
        }
        return mapa
      }, new Map())
    convenios.value = ordenarConveniosPorNome(Array.from(normalizados.values()))
  } catch (err) {
    console.error('Erro ao buscar convênios', err)
    convenios.value = []
  } finally {
    estaCarregandoConvenios.value = false
  }
}

const atualizarDependencia = (valor: string) => {
  const normalizado = normalizarDependenciaValor(valor)
  form.value.depende_de_id = normalizado
}

const carregarEtapasDependencia = async () => {
  try {
    carregandoEtapasDependencia.value = true
    const response = await api.get('/etapas')
    const lista = Array.isArray(response.data) ? response.data : []

    const opcoes = lista
      .map((item) => {
        const registro = item as { id?: unknown; nome?: unknown }
        const id = normalizarDependenciaValor(registro?.id)
        if (id === null) {
          return null
        }
        const nomeBruto =
          typeof registro?.nome === 'string' ? (registro.nome as string) : ''
        const nome = nomeBruto.trim().length ? nomeBruto.trim() : `Etapa ${id}`
        return { id, nome }
      })
      .filter((item): item is EtapaSelecaoOption => Boolean(item))

    etapasDependencia.value = opcoes
  } catch (err) {
    console.error('Erro ao carregar etapas para dependência', err)
    etapasDependencia.value = []
  } finally {
    carregandoEtapasDependencia.value = false
  }
}

const carregarConfiguracao = async () => {
  if (configuracaoCarregada.value || carregandoConfiguracao.value) {
    return
  }

  carregandoConfiguracao.value = true
  try {
    const response = await api.get('/etapas/config')
    const dados = response.data ?? {}
    const maxTipos = normalizaLimite(dados.maxTipos)
    const maxConvenios = normalizaLimite(dados.maxConvenios)
    const modeloRecebido = dados.modelo === 'antigo' ? 'antigo' : dados.modelo === 'novo' ? 'novo' : 'desconhecido'

    configuracao.value = {
      modelo: modeloRecebido,
      suportaMultiplosTipos:
        dados.suportaMultiplosTipos !== false && (maxTipos === null || maxTipos > 1),
      suportaMultiplosConvenios:
        dados.suportaMultiplosConvenios !== false && (maxConvenios === null || maxConvenios > 1),
      maxTipos: maxTipos,
      maxConvenios: maxConvenios,
    }
    configuracaoCarregada.value = true
  } catch (err) {
    console.error('Erro ao carregar configuração das etapas', err)
    configuracao.value = { ...configuracaoPadrao }
  } finally {
    carregandoConfiguracao.value = false
    aplicarLimites()
  }
}

const abrirLista = () => {
  dropdownAberto.value = true
  if (convenios.value.length === 0) {
    carregarConvenios(searchTerm.value)
  }
  nextTick(() => {
    searchInput.value?.focus()
  })
}

const fecharLista = () => {
  dropdownAberto.value = false
}

const aoDigitar = () => {
  dropdownAberto.value = true
  if (debounceId) clearTimeout(debounceId)
  debounceId = setTimeout(() => {
    carregarConvenios(searchTerm.value)
  }, 250)
}

const removerConvenio = (id: number) => {
  selectedConvenios.value = selectedConvenios.value.filter((item) => item.id !== id)
  form.value.convenio_ids = form.value.convenio_ids.filter((valor) => valor !== id)
  aplicarLimites()
}

const selecionarConvenio = (item: ConvenioOption) => {
  const jaSelecionado = form.value.convenio_ids.includes(item.id)
  if (jaSelecionado) {
    removerConvenio(item.id)
    return
  }

  const limiteConvenios = obterLimite(configuracao.value.maxConvenios, configuracao.value.suportaMultiplosConvenios)
  const novoConvenio: ConvenioSelecionado = {
    id: item.id,
    nome: item.nome,
    nomeExibicao: item.nomeExibicao,
    registro_ans: item.registro_ans,
    referencia: null,
    usa_integracao: false,
  }

  if (limiteConvenios === 1) {
    form.value.convenio_ids = [item.id]
    selectedConvenios.value = [novoConvenio]
  } else {
    const idsSemDuplicados = form.value.convenio_ids.filter((valor) => valor !== item.id)
    const conveniosSemDuplicados = selectedConvenios.value.filter((conv) => conv.id !== item.id)

    idsSemDuplicados.push(item.id)
    conveniosSemDuplicados.push(novoConvenio)

    if (typeof limiteConvenios === 'number' && limiteConvenios > 0 && idsSemDuplicados.length > limiteConvenios) {
      const idsPermitidos = idsSemDuplicados.slice(-limiteConvenios)
      form.value.convenio_ids = idsPermitidos
      const idsSet = new Set(idsPermitidos)
      selectedConvenios.value = conveniosSemDuplicados.filter((conv) => idsSet.has(conv.id))
    } else {
      form.value.convenio_ids = idsSemDuplicados
      selectedConvenios.value = conveniosSemDuplicados
    }
  }

  searchTerm.value = ''
  aplicarLimites()
}

const aoClicarFora = (event: MouseEvent) => {
  if (!dropdownAberto.value) return

  const wrapper = conveniosWrapper.value
  if (!wrapper) return

  const target = event.target as Node | null
  if (target && !wrapper.contains(target)) {
    fecharLista()
  }
}

const estaTipoSelecionado = (id: number) => form.value.procedimento_tipo_ids.includes(id)

const alternarTipo = (id: number, checked: boolean) => {
  const limiteTipos = obterLimite(configuracao.value.maxTipos, configuracao.value.suportaMultiplosTipos)

  if (!checked) {
    form.value.procedimento_tipo_ids = form.value.procedimento_tipo_ids.filter((valor) => valor !== id)
    aplicarLimites()
    return
  }

  if (limiteTipos === 1) {
    form.value.procedimento_tipo_ids = [id]
    aplicarLimites()
    return
  }

  const idsSemDuplicados = form.value.procedimento_tipo_ids.filter((valor) => valor !== id)
  idsSemDuplicados.push(id)

  if (typeof limiteTipos === 'number' && limiteTipos > 0 && idsSemDuplicados.length > limiteTipos) {
    form.value.procedimento_tipo_ids = idsSemDuplicados.slice(-limiteTipos)
  } else {
    form.value.procedimento_tipo_ids = idsSemDuplicados
  }

  aplicarLimites()
}

const preencherDados = (dados: EtapaDetalhes | null) => {
  if (dados) {
    const tiposIds = normalizaIds(dados.procedimento_tipo_ids)
    const conveniosIds = normalizaIds(dados.convenio_ids)
    const dependenciaIdInicial = normalizarDependenciaValor(
      dados.depende_de_id ?? dados.depende_de?.id
    )
    const dependenciaId =
      dependenciaIdInicial !== null && dependenciaIdInicial === dados.id
        ? null
        : dependenciaIdInicial

    form.value = {
      id: dados.id,
      nome: dados.nome,
      procedimento_tipo_ids: tiposIds,
      convenio_ids: conveniosIds,
      ativo: Boolean(dados.ativo),
      dias_previstos: normalizarDiasPrevistosValor(dados.dias_previstos),
      minimo_anexos: normalizarMinimoAnexosValor(dados.minimo_anexos),
      solicitar_data_limite: Boolean(dados.solicitar_data_limite),
      depende_de_id: dependenciaId,
      sequencia: normalizarSequenciaValor(dados.sequencia ?? dados.ordem),
    }

    const detalhados = dados.convenios || []
    selectedConvenios.value = conveniosIds.map((id) => {
      const info = detalhados.find((item) => item.id === id)
      return {
        id,
        nome: info?.nome || 'Convênio não encontrado',
        nomeExibicao: info?.nome ? `${info.nome} (${id})` : `Convênio ${id}`,
        referencia: info?.referencia ?? null,
        usa_integracao: info?.usa_integracao,
      }
    })
  } else {
    form.value = {
      nome: '',
      procedimento_tipo_ids: [],
      convenio_ids: [],
      ativo: true,
      dias_previstos: null,
      minimo_anexos: 0,
      solicitar_data_limite: false,
      depende_de_id: null,
      sequencia: null,
    }
    selectedConvenios.value = []
  }

  searchTerm.value = ''
  sanitizarDiasPrevistos()
  sanitizarMinimoAnexos()
  sanitizarSequencia()
  aplicarLimites()
}

const informacoesIntegracao = computed(() =>
  selectedConvenios.value
    .map((item) => {
      if (!item.referencia) return null
      return item.usa_integracao
        ? `Integração detectada. Referência externa: ${item.referencia}`
        : `Cadastro interno. Referência: ${item.referencia}`
    })
    .filter((mensagem): mensagem is string => Boolean(mensagem))
)

const salvar = async () => {
  if (!form.value.convenio_ids.length) {
    emit('erro', { tipo: 'error', mensagem: 'Selecione ao menos um convênio' })
    return
  }

  if (!form.value.procedimento_tipo_ids.length) {
    emit('erro', { tipo: 'error', mensagem: 'Selecione ao menos um tipo de procedimento' })
    return
  }

  sanitizarDiasPrevistos()
  sanitizarMinimoAnexos()
  sanitizarSequencia()

  const payload = {
    nome: form.value.nome,
    procedimento_tipo_ids: form.value.procedimento_tipo_ids,
    convenio_ids: form.value.convenio_ids,
    ativo: form.value.ativo,
    dias_previstos: form.value.dias_previstos,
    minimo_anexos: form.value.minimo_anexos,
    solicitar_data_limite: form.value.solicitar_data_limite,
    depende_de_id: form.value.depende_de_id,
    sequencia: form.value.sequencia,
  }

  try {
    if (form.value.id) {
      await api.put(`/etapas/${form.value.id}`, payload)
      emit('sucesso', { tipo: 'success', mensagem: 'Etapa atualizada com sucesso' })
    } else {
      await api.post('/etapas', payload)
      emit('sucesso', { tipo: 'success', mensagem: 'Etapa criada com sucesso' })
    }
    emit('close', true)
  } catch (err) {
    console.error(err)
    const error = err as { response?: { data?: { error?: string } } }
    const mensagem = error.response?.data?.error || 'Erro ao salvar etapa'
    emit('erro', { tipo: 'error', mensagem })
  }
}

watch(etapasParaSelecao, (lista) => {
  if (form.value.depende_de_id === null) {
    return
  }

  const existe = lista.some((etapa) => etapa.id === form.value.depende_de_id)
  if (!existe) {
    form.value.depende_de_id = null
  }
})

watch(
  () => configuracao.value,
  () => {
    aplicarLimites()
  },
  { deep: true }
)

watch(
  () => props.dados,
  (val) => {
    preencherDados(val)
  },
  { immediate: true }
)

watch(
  () => props.isOpen,
  (abriu) => {
    if (abriu) {
      carregarConfiguracao()
      if (tipos.value.length === 0) {
        carregarTipos()
      }
      carregarConvenios(searchTerm.value)
      carregarEtapasDependencia()
      dropdownAberto.value = false
    } else {
      if (debounceId) clearTimeout(debounceId)
      fecharLista()
    }
  },
  { immediate: true }
)

onMounted(() => {
  window.addEventListener('mousedown', aoClicarFora)
})

onBeforeUnmount(() => {
  window.removeEventListener('mousedown', aoClicarFora)
})
</script>
