<template>
  <LayoutAuthenticated>
    <SectionMain>
      <div class="flex flex-col gap-6 min-h-[calc(100vh-180px)]">
        <div ref="menuWrapper" class="relative">
          <SorteiosHeader
            :page-title="pageTitle"
            :acao-icon="acaoIcone"
            :acao-tooltip="acaoLabel"
            :acao-disabled="!sorteioSelecionado"
            @novo="toggleNovoMenu"
            @acao="acionarSorteio"
          >
            <template #actions>
              <div class="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  :startIcon="EditIcon"
                  :disabled="!sorteioSelecionado"
                  @click="abrirEdicao"
                >
                  Editar
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-error-600 ring-error-200 hover:bg-error-50 dark:text-error-400 dark:ring-error-500/60 dark:hover:bg-error-500/10"
                  :startIcon="TrashIcon"
                  :disabled="!sorteioSelecionado"
                  @click="confirmarExclusao"
                >
                  Excluir
                </Button>
              </div>
            </template>
          </SorteiosHeader>

          <div
            v-if="novoMenuAberto"
            ref="dropdownRef"
            class="absolute z-30 mt-1 w-52 rounded-xl border border-gray-200 bg-white shadow-theme-lg dark:border-gray-700 dark:bg-gray-900"
          >
            <button
              class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
              @click="abrirCriacao('nome')"
            >
              Por Nome
              <span class="text-xs text-gray-400">Lista manual ou arquivo</span>
            </button>
            <div class="h-px bg-gray-100 dark:bg-gray-700"></div>
            <button
              class="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-white/10"
              @click="abrirCriacao('numero')"
            >
              Por Número
              <span class="text-xs text-gray-400">Faixa numérica</span>
            </button>
          </div>
        </div>

        <ComponentCard
          :title="pageTitle"
          class-name="flex flex-col flex-1 min-h-0"
          body-class="flex flex-col flex-1 min-h-0"
          content-class="flex flex-col flex-1 min-h-0 gap-4"
        >
          <div class="flex flex-wrap items-center gap-3">
            <input
              v-model="filtro"
              type="text"
              placeholder="Buscar sorteio por título, tipo ou status..."
              class="w-full max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </div>

          <div class="flex-1 min-h-0 overflow-hidden rounded-xl border border-gray-100 dark:border-gray-800">
            <div class="overflow-x-auto">
              <table class="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-800">
                <thead class="bg-gray-50 text-left uppercase text-xs font-semibold text-gray-500 dark:bg-gray-800/60 dark:text-gray-400">
                  <tr>
                    <th class="w-3"></th>
                    <th class="px-4 py-3">Título</th>
                    <th class="px-4 py-3">Tipo</th>
                    <th class="px-4 py-3">Entradas</th>
                    <th class="px-4 py-3">Resultados</th>
                    <th class="px-4 py-3">Status</th>
                    <th class="px-4 py-3">Criado em</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
                  <tr v-if="sorteiosFiltrados.length === 0">
                    <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                      Nenhum sorteio encontrado.
                    </td>
                  </tr>
                  <tr
                    v-for="sorteio in sorteiosPaginados"
                    v-else
                    :key="sorteio.id"
                    :class="[
                      'group cursor-pointer transition hover:bg-gray-50 dark:hover:bg-white/5',
                      sorteioSelecionado?.id === sorteio.id ? 'bg-gray-100 dark:bg-gray-800' : '',
                    ]"
                    @click="selecionarSorteio(sorteio.id)"
                  >
                    <td class="w-3 px-0">
                      <span
                        :class="[
                          'block h-full w-1 rounded-r-lg bg-transparent transition',
                          sorteioSelecionado?.id === sorteio.id
                            ? 'bg-brand-500'
                            : 'group-hover:bg-gray-200 dark:group-hover:bg-gray-700',
                        ]"
                      ></span>
                    </td>
                    <td class="px-4 py-3 text-sm font-medium text-gray-800 dark:text-gray-100">{{ sorteio.titulo }}</td>
                    <td class="px-4 py-3 capitalize text-gray-700 dark:text-gray-200">{{ tipoLabel(sorteio.tipo) }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ sorteio.entradas.length }}</td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">
                      {{ sorteio.resultados.length }} / {{ sorteio.quantidadeResultados }}
                    </td>
                    <td class="px-4 py-3">
                      <span :class="statusClasse(sorteio.status)" class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold">
                        {{ statusLabel(sorteio.status) }}
                      </span>
                    </td>
                    <td class="px-4 py-3 text-gray-600 dark:text-gray-300">{{ formatarData(sorteio.criadoEm) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 p-4 text-sm text-gray-600 dark:border-gray-800 dark:text-gray-300">
            <div>
              <template v-if="sorteiosFiltrados.length">
                Mostrando {{ indiceInicial }}-{{ indiceFinal }} de {{ sorteiosFiltrados.length }} sorteio(s)
              </template>
              <template v-else>
                Nenhum sorteio para exibir
              </template>
            </div>
            <div class="flex items-center gap-2">
              <button
                class="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                :disabled="paginaAtual === 0"
                @click="irParaPagina(paginaAtual - 1)"
              >
                Anterior
              </button>
              <button
                v-for="pagina in paginasVisiveis"
                :key="pagina"
                class="rounded-lg px-3 py-1 text-xs font-semibold transition"
                :class="[
                  paginaAtual === pagina
                    ? 'bg-brand-600 text-white shadow-theme-xs'
                    : 'border border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5',
                ]"
                @click="irParaPagina(pagina)"
              >
                {{ pagina + 1 }}
              </button>
              <button
                class="rounded-lg border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/5"
                :disabled="paginaAtual >= totalPaginas - 1"
                @click="irParaPagina(paginaAtual + 1)"
              >
                Próxima
              </button>
            </div>
            <div class="text-xs text-gray-500 dark:text-gray-400">
              Página {{ sorteiosFiltrados.length ? paginaAtual + 1 : 0 }} de {{ totalPaginas }}
            </div>
          </div>
        </ComponentCard>
      </div>
    </SectionMain>
  </LayoutAuthenticated>

  <Modal v-if="modalCriacaoAberto" fullScreenBackdrop @close="fecharModalCriacao">
    <div class="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div>
          <h2 class="text-lg font-semibold text-gray-800 dark:text-white/90">
            {{
              modoEdicao
                ? 'Editar sorteio'
                : `Novo sorteio ${tipoLabel(tipoCriacao ?? 'nome')}`
            }}
          </h2>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ modoEdicao ? 'Atualize as informações do sorteio selecionado.' : 'Preencha os dados e valide antes de salvar.' }}
          </p>
        </div>
        <button class="text-gray-400 transition hover:text-gray-600" @click="fecharModalCriacao">✕</button>
      </div>

      <div class="flex flex-col gap-5 px-6 py-5">
        <Alert
          v-if="errosCriacao.length > 0"
          variant="error"
          title="Revise as informações"
          :message="errosCriacao.join(' \n ')"
        />

        <div class="grid gap-4 md:grid-cols-2">
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Título do sorteio
            <input
              v-if="tipoCriacao === 'nome'"
              v-model="formNome.titulo"
              type="text"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Ex: Sorteio por Nome"
            />
            <input
              v-else
              v-model="formNumero.titulo"
              type="text"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Ex: Sorteio por Número"
            />
          </label>

          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Quantidade de resultados
            <input
              v-if="tipoCriacao === 'nome'"
              v-model.number="formNome.quantidadeResultados"
              type="number"
              min="1"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
            <input
              v-else
              v-model.number="formNumero.quantidadeResultados"
              type="number"
              min="1"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
            />
          </label>
        </div>

        <template v-if="tipoCriacao === 'nome'">
          <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
            Lista de nomes
            <textarea
              v-model="formNome.nomesTexto"
              rows="6"
              class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              placeholder="Informe um nome por linha"
            ></textarea>
            <div class="flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
              <label class="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 transition hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-white/10">
                <input type="file" accept=".txt" class="hidden" @change="carregarArquivoNomes" />
                <span class="font-semibold text-brand-600">Upload .txt</span>
                <span class="text-gray-400">ou cole os nomes acima</span>
              </label>
              <span>Únicos: {{ nomesUnicos.length }}</span>
              <span>Duplicados: {{ nomesDuplicados.length }}</span>
            </div>
            <p v-if="nomesDuplicados.length" class="text-xs text-error-500">
              Nomes duplicados encontrados: {{ nomesDuplicados.join(', ') }}
            </p>
          </label>
        </template>

        <template v-else>
          <div class="grid gap-4 md:grid-cols-2">
            <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Número inicial (De)
              <input
                v-model.number="formNumero.de"
                type="number"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
            <label class="flex flex-col gap-2 text-sm font-medium text-gray-700 dark:text-gray-200">
              Número final (Até)
              <input
                v-model.number="formNumero.ate"
                type="number"
                class="rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-800 shadow-theme-xs focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
              />
            </label>
          </div>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            Faixa disponível: <span class="font-semibold text-gray-700 dark:text-gray-200">{{ numerosDisponiveis }}</span> números únicos.
          </p>
        </template>

        <div class="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 dark:border-gray-800">
          <Button variant="outline" @click="fecharModalCriacao">Cancelar</Button>
          <Button :disabled="!podeSalvar" @click="salvarSorteio">Salvar sorteio</Button>
        </div>
      </div>
    </div>
  </Modal>

  <Modal
    v-if="modalExecucaoAberto && sorteioEmExecucao"
    fullScreenBackdrop
    fullViewport
    @close="fecharModalExecucao"
  >
    <div class="relative flex h-full w-full flex-col bg-gray-900/90 px-4 pb-10">
      <div class="absolute top-6 right-6 z-20">
        <button
          class="rounded-full bg-white/10 px-3 py-2 text-sm font-medium text-white backdrop-blur transition hover:bg-white/20"
          @click="fecharModalExecucao"
        >
          Fechar
        </button>
      </div>

      <div class="relative z-10 flex w-full flex-1 flex-col gap-6 text-center text-white">
        <div class="flex flex-col items-center gap-2">
          <p class="text-xs uppercase tracking-[0.2em] text-white/60">Gestão de Pessoas - Sorteio</p>
          <h2 class="text-3xl font-bold">{{ sorteioEmExecucao.titulo }}</h2>
          <p class="text-white/70">{{ tipoLabel(sorteioEmExecucao.tipo) }} · {{ sorteioEmExecucao.quantidadeResultados }} resultado(s)</p>
        </div>

        <div class="relative flex w-full flex-1 items-center justify-center overflow-hidden py-12">
          <div ref="fireworksContainer" class="pointer-events-none absolute inset-0" aria-hidden="true"></div>

          <Transition name="fade-scale" mode="out-in">
            <div v-if="countdown" key="countdown" class="countdown-badge">
              {{ countdown }}
            </div>
            <div v-else-if="resultadoEmDestaque" key="resultado" class="resultado-badge">
              {{ resultadoEmDestaque }}
            </div>
            <p v-else key="aguardando" class="relative z-10 text-white/70">
              Clique em "Sortear" para iniciar a contagem regressiva.
            </p>
          </Transition>
        </div>

        <div class="mt-auto w-full space-y-4 pt-6">
          <div class="flex justify-center">
            <Button
              v-if="!sorteioConcluido"
              size="md"
              variant="primary"
              :startIcon="PlayIcon"
              :disabled="!podeSortear || isSorteando"
              @click="sortearProximo"
            >
              Sortear ({{ proximoResultado }}) / {{ sorteioEmExecucao.quantidadeResultados }}
            </Button>
            <Button
              v-else
              size="md"
              variant="outline"
              :startIcon="EyeIcon"
              @click="fecharModalExecucao"
            >
              Sorteio concluído
            </Button>
          </div>

          <div class="grid w-full grid-cols-1 gap-3 md:grid-cols-2">
            <div class="rounded-2xl bg-white/5 p-4 text-left">
              <p class="text-sm font-semibold text-white">Resultados até agora</p>
              <div class="mt-3 flex flex-wrap gap-2">
                <span
                  v-for="(valor, index) in sorteioEmExecucao.resultados"
                  :key="`${valor}-${index}`"
                  class="rounded-full bg-white/10 px-4 py-2 text-sm font-semibold"
                >
                  {{ index + 1 }}º - {{ valor }}
                </span>
                <p v-if="!sorteioEmExecucao.resultados.length" class="text-sm text-white/70">Nenhum resultado sorteado ainda.</p>
              </div>
            </div>
            <div class="rounded-2xl bg-white/5 p-4 text-left">
              <p class="text-sm font-semibold text-white">Entradas restantes</p>
              <p class="mt-3 text-sm text-white/70">{{ sorteioEmExecucao.restantes.length }} disponíveis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Modal>

  <Modal v-if="modalResultadosAberto && sorteioVisualizado" fullScreenBackdrop @close="fecharModalResultados">
    <div class="relative w-full max-w-lg overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-theme-xl dark:border-gray-700 dark:bg-gray-900">
      <div class="flex items-start justify-between gap-4 border-b border-gray-100 px-6 py-5 dark:border-gray-800">
        <div>
          <h3 class="text-lg font-semibold text-gray-800 dark:text-white/90">Resultado do sorteio</h3>
          <p class="text-sm text-gray-500 dark:text-gray-400">{{ sorteioVisualizado?.titulo }}</p>
        </div>
        <button class="text-gray-400 transition hover:text-gray-600" @click="fecharModalResultados">✕</button>
      </div>
      <div class="flex flex-col gap-3 px-6 py-5">
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(resultado, index) in sorteioVisualizado?.resultados"
            :key="`${resultado}-${index}`"
            class="rounded-full bg-gray-100 px-3 py-2 text-sm font-semibold text-gray-700 dark:bg-gray-800 dark:text-gray-200"
          >
            {{ index + 1 }}º - {{ resultado }}
          </span>
        </div>
        <p v-if="!sorteioVisualizado?.resultados.length" class="text-sm text-gray-500 dark:text-gray-400">
          Nenhum resultado registrado.
        </p>
        <div class="flex items-center justify-end pt-2">
          <Button variant="outline" @click="fecharModalResultados">Fechar</Button>
        </div>
      </div>
    </div>
  </Modal>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Alert from '@/components/ui/Alert.vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import ComponentCard from '@/components/common/ComponentCard.vue'
import LayoutAuthenticated from '@/components/layout/LayoutAuthenticated.vue'
import SectionMain from '@/components/layout/SectionMain.vue'
import SorteiosHeader from '@/components/gestao-pessoas/SorteiosHeader.vue'
import { EditIcon, EyeIcon, PlayIcon, TrashIcon } from '@/icons'
import { Fireworks } from 'fireworks-js'

interface Sorteio {
  id: string
  titulo: string
  tipo: 'nome' | 'numero'
  quantidadeResultados: number
  entradas: string[]
  restantes: string[]
  resultados: string[]
  status: 'pendente' | 'em_andamento' | 'concluido'
  criadoEm: string
}

const pageTitle = 'Gestão de Pessoas - Sorteios'
const STORAGE_KEY = 'gestao-pessoas-sorteios'

const sorteios = ref<Sorteio[]>([])
const sorteioSelecionadoId = ref<string | null>(null)
const filtro = ref('')
const paginaAtual = ref(0)
const itensPorPagina = 8
const novoMenuAberto = ref(false)
const modalCriacaoAberto = ref(false)
const modalExecucaoAberto = ref(false)
const modalResultadosAberto = ref(false)
const tipoCriacao = ref<'nome' | 'numero' | null>(null)
const errosCriacao = ref<string[]>([])
const sorteioEmExecucaoId = ref<string | null>(null)
const sorteioVisualizadoId = ref<string | null>(null)
const sorteioEmEdicaoId = ref<string | null>(null)
const dropdownRef = ref<HTMLElement | null>(null)
const menuWrapper = ref<HTMLElement | null>(null)
const countdown = ref<number | null>(null)
const resultadoEmDestaque = ref<string | null>(null)
const isSorteando = ref(false)
const fireworksContainer = ref<HTMLElement | null>(null)
let fireworks: Fireworks | null = null
let fireworkStopTimer: number | null = null
let countdownInterval: number | null = null

const formNome = ref({
  titulo: 'Sorteio por Nome',
  quantidadeResultados: 1,
  nomesTexto: '',
})

const formNumero = ref({
  titulo: 'Sorteio por Número',
  quantidadeResultados: 1,
  de: 1,
  ate: 10,
})

const tipoLabel = (tipo: Sorteio['tipo']) => (tipo === 'nome' ? 'Por nome' : 'Por número')

const statusLabel = (status: Sorteio['status']) => {
  if (status === 'em_andamento') return 'Em andamento'
  if (status === 'concluido') return 'Concluído'
  return 'Pendente'
}

const statusClasse = (status: Sorteio['status']) => {
  if (status === 'concluido') return 'bg-success-100 text-success-700 dark:bg-success-500/20 dark:text-success-100'
  if (status === 'em_andamento') return 'bg-warning-100 text-warning-700 dark:bg-warning-500/20 dark:text-warning-50'
  return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-200'
}

const formatarData = (valor: string) => {
  const data = new Date(valor)
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(data)
}

const normalizarPesquisa = (valor: string) =>
  valor
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

const sorteiosOrdenados = computed(() =>
  [...sorteios.value].sort((a, b) => new Date(b.criadoEm).getTime() - new Date(a.criadoEm).getTime()),
)

const sorteioSelecionado = computed(() =>
  sorteiosOrdenados.value.find((item) => item.id === sorteioSelecionadoId.value) || null,
)

const sorteioEmExecucao = computed(() =>
  sorteios.value.find((item) => item.id === sorteioEmExecucaoId.value) || null,
)

const sorteioVisualizado = computed(() =>
  sorteios.value.find((item) => item.id === sorteioVisualizadoId.value) || null,
)

const modoEdicao = computed(() => sorteioEmEdicaoId.value !== null)

const nomesProcessados = computed(() =>
  formNome.value.nomesTexto
    .split(/\r?\n/)
    .map((nome) => nome.trim())
    .filter((nome) => nome.length > 0),
)

const nomesUnicos = computed(() => Array.from(new Set(nomesProcessados.value.map((nome) => nome.toLowerCase()))))

const nomesDuplicados = computed(() => {
  const contagem = new Map<string, number>()
  nomesProcessados.value.forEach((nome) => {
    const chave = nome.toLowerCase()
    contagem.set(chave, (contagem.get(chave) ?? 0) + 1)
  })
  return Array.from(contagem.entries())
    .filter(([, quantidade]) => quantidade > 1)
    .map(([nome]) => nome)
})

const numerosDisponiveis = computed(() =>
  formNumero.value.ate >= formNumero.value.de ? formNumero.value.ate - formNumero.value.de + 1 : 0,
)

const sorteiosFiltrados = computed(() => {
  const termo = normalizarPesquisa(filtro.value.trim())

  if (!termo) {
    return sorteiosOrdenados.value
  }

  return sorteiosOrdenados.value.filter((sorteio) => {
    const campos = [
      normalizarPesquisa(sorteio.titulo),
      normalizarPesquisa(tipoLabel(sorteio.tipo)),
      normalizarPesquisa(statusLabel(sorteio.status)),
    ]

    return campos.some((campo) => campo.includes(termo))
  })
})

const totalPaginas = computed(() =>
  Math.max(1, Math.ceil(sorteiosFiltrados.value.length / itensPorPagina)),
)

const paginasVisiveis = computed(() => {
  const total = totalPaginas.value
  const max = 5

  if (total <= max) {
    return Array.from({ length: total }, (_, index) => index)
  }

  const inicio = Math.max(0, Math.min(paginaAtual.value - 2, total - max))
  const fim = Math.min(total, inicio + max)

  return Array.from({ length: fim - inicio }, (_, index) => inicio + index)
})

const sorteiosPaginados = computed(() => {
  const inicio = paginaAtual.value * itensPorPagina
  return sorteiosFiltrados.value.slice(inicio, inicio + itensPorPagina)
})

const indiceInicial = computed(() =>
  sorteiosFiltrados.value.length ? paginaAtual.value * itensPorPagina + 1 : 0,
)

const indiceFinal = computed(() =>
  Math.min(sorteiosFiltrados.value.length, (paginaAtual.value + 1) * itensPorPagina),
)

const acaoIcone = computed(() => (sorteioSelecionado.value?.status === 'concluido' ? EyeIcon : PlayIcon))
const acaoLabel = computed(() => (sorteioSelecionado.value?.status === 'concluido' ? 'Visualizar' : 'Iniciar'))

const podeSalvar = computed(() => {
  if (tipoCriacao.value === 'nome') {
    return (
      formNome.value.titulo.trim().length > 0 &&
      formNome.value.quantidadeResultados > 0 &&
      nomesUnicos.value.length >= formNome.value.quantidadeResultados &&
      nomesDuplicados.value.length === 0
    )
  }

  if (tipoCriacao.value === 'numero') {
    return (
      formNumero.value.titulo.trim().length > 0 &&
      formNumero.value.quantidadeResultados > 0 &&
      numerosDisponiveis.value >= formNumero.value.quantidadeResultados
    )
  }

  return false
})

const sorteioConcluido = computed(() => {
  if (!sorteioEmExecucao.value) return false

  return sorteioEmExecucao.value.resultados.length >= sorteioEmExecucao.value.quantidadeResultados
})

const proximoResultado = computed(() => (sorteioEmExecucao.value?.resultados.length ?? 0) + 1)
const podeSortear = computed(
  () =>
    !!sorteioEmExecucao.value &&
    sorteioEmExecucao.value.restantes.length > 0 &&
    (sorteioEmExecucao.value?.resultados.length ?? 0) < (sorteioEmExecucao.value?.quantidadeResultados ?? 0),
)

const pararFogos = () => {
  if (fireworkStopTimer) {
    window.clearTimeout(fireworkStopTimer)
    fireworkStopTimer = null
  }

  fireworks?.stop()
}

const dispararFogos = () => {
  if (!fireworksContainer.value) return

  pararFogos()

  if (!fireworks) {
    const { clientWidth, clientHeight } = fireworksContainer.value

    fireworks = new Fireworks(fireworksContainer.value, {
      autoresize: true,
      opacity: 0.35,
      acceleration: 1.05,
      friction: 0.97,
      gravity: 1.5,
      particles: 140,
      trace: 4,
      explosion: 7,
      brightness: { min: 55, max: 80 },
      sound: { enabled: false },
      boundaries: {
        x: 20,
        y: 20,
        width: Math.max(clientWidth - 40, 200),
        height: Math.max(clientHeight - 40, 200),
      },
    })
  }

  if (!fireworks) return

  fireworks.start()

  fireworkStopTimer = window.setTimeout(() => {
    fireworks?.stop()
    fireworkStopTimer = null
  }, 3800)
}

const irParaPagina = (pagina: number) => {
  const ultimaPagina = Math.max(0, totalPaginas.value - 1)
  paginaAtual.value = Math.min(Math.max(0, pagina), ultimaPagina)
}

const toggleNovoMenu = () => {
  novoMenuAberto.value = !novoMenuAberto.value
}

const fecharDropdown = (event: MouseEvent) => {
  const target = event.target as HTMLElement
  if (
    novoMenuAberto.value &&
    dropdownRef.value &&
    !dropdownRef.value.contains(target) &&
    menuWrapper.value &&
    !menuWrapper.value.contains(target)
  ) {
    novoMenuAberto.value = false
  }
}

onBeforeUnmount(() => {
  document.removeEventListener('click', fecharDropdown)
  pararFogos()
  if (countdownInterval) {
    window.clearInterval(countdownInterval)
    countdownInterval = null
  }
})

const carregarSorteios = () => {
  if (typeof window === 'undefined') return

  try {
    const dadosSalvos = localStorage.getItem(STORAGE_KEY)

    if (dadosSalvos) {
      const lista = JSON.parse(dadosSalvos) as Sorteio[]
      sorteios.value = lista
      if (lista.length > 0) {
        sorteioSelecionadoId.value = lista[0].id
      }
    }
  } catch (error) {
    console.error('Falha ao carregar sorteios salvos', error)
  }
}

const persistirSorteios = () => {
  if (typeof window === 'undefined') return

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sorteios.value))
  } catch (error) {
    console.error('Falha ao salvar sorteios localmente', error)
  }
}

onMounted(() => {
  carregarSorteios()
  document.addEventListener('click', fecharDropdown)
})

watch(filtro, () => {
  paginaAtual.value = 0
})

watch(sorteiosFiltrados, () => {
  const ultimaPagina = Math.max(0, totalPaginas.value - 1)

  if (paginaAtual.value > ultimaPagina) {
    paginaAtual.value = ultimaPagina
  }
})

watch(
  sorteios,
  () => {
    persistirSorteios()
  },
  { deep: true },
)

const limparErros = () => {
  errosCriacao.value = []
}

const abrirCriacao = (tipo: 'nome' | 'numero') => {
  sorteioEmEdicaoId.value = null
  tipoCriacao.value = tipo
  novoMenuAberto.value = false
  limparErros()
  if (tipo === 'nome') {
    formNome.value = {
      titulo: `Sorteio por Nome #${sorteios.value.length + 1}`,
      quantidadeResultados: 1,
      nomesTexto: '',
    }
  } else {
    formNumero.value = {
      titulo: `Sorteio por Número #${sorteios.value.length + 1}`,
      quantidadeResultados: 1,
      de: 1,
      ate: 10,
    }
  }
  modalCriacaoAberto.value = true
}

const fecharModalCriacao = () => {
  modalCriacaoAberto.value = false
  tipoCriacao.value = null
  sorteioEmEdicaoId.value = null
}

const carregarArquivoNomes = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const content = await file.text()
  formNome.value.nomesTexto = content
}

const preencherFormularioEdicao = (sorteio: Sorteio) => {
  tipoCriacao.value = sorteio.tipo
  sorteioEmEdicaoId.value = sorteio.id
  limparErros()

  if (sorteio.tipo === 'nome') {
    formNome.value = {
      titulo: sorteio.titulo,
      quantidadeResultados: sorteio.quantidadeResultados,
      nomesTexto: sorteio.entradas.join('\n'),
    }
  } else {
    const numeros = sorteio.entradas.map((valor) => Number(valor)).filter((valor) => !Number.isNaN(valor))
    const de = numeros.length ? Math.min(...numeros) : 1
    const ate = numeros.length ? Math.max(...numeros) : 1

    formNumero.value = {
      titulo: sorteio.titulo,
      quantidadeResultados: sorteio.quantidadeResultados,
      de,
      ate,
    }
  }

  modalCriacaoAberto.value = true
}

const abrirEdicao = () => {
  if (!sorteioSelecionado.value) return

  preencherFormularioEdicao(sorteioSelecionado.value)
}

const gerarId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 10)

const atualizarSorteioEditado = (dados: Pick<Sorteio, 'titulo' | 'tipo' | 'quantidadeResultados' | 'entradas'>) => {
  if (!sorteioEmEdicaoId.value) return

  const indice = sorteios.value.findIndex((item) => item.id === sorteioEmEdicaoId.value)

  if (indice === -1) return

  const sorteioAnterior = sorteios.value[indice]
  const atualizado: Sorteio = {
    ...sorteioAnterior,
    ...dados,
    restantes: [...dados.entradas],
    resultados: [],
    status: 'pendente',
  }

  sorteios.value.splice(indice, 1, atualizado)
  sorteioSelecionadoId.value = atualizado.id
}

const salvarSorteio = () => {
  limparErros()

  if (tipoCriacao.value === 'nome') {
    if (!formNome.value.titulo.trim()) {
      errosCriacao.value.push('Informe um título para o sorteio.')
    }
    if (formNome.value.quantidadeResultados < 1) {
      errosCriacao.value.push('A quantidade de resultados deve ser maior que zero.')
    }
    if (nomesDuplicados.value.length > 0) {
      errosCriacao.value.push('Remova nomes duplicados para continuar o sorteio.')
    }
    if (nomesUnicos.value.length === 0) {
      errosCriacao.value.push('Informe pelo menos um nome.')
    }
    if (nomesUnicos.value.length < formNome.value.quantidadeResultados) {
      errosCriacao.value.push('A quantidade de resultados deve ser menor ou igual ao total de nomes únicos.')
    }

    if (errosCriacao.value.length === 0) {
      const entradasNormalizadas = nomesProcessados.value.map((nome) => nome.trim())
      if (modoEdicao.value) {
        atualizarSorteioEditado({
          titulo: formNome.value.titulo.trim(),
          tipo: 'nome',
          quantidadeResultados: formNome.value.quantidadeResultados,
          entradas: entradasNormalizadas,
        })
      } else {
        const novoSorteio: Sorteio = {
          id: gerarId(),
          titulo: formNome.value.titulo.trim(),
          tipo: 'nome',
          quantidadeResultados: formNome.value.quantidadeResultados,
          entradas: entradasNormalizadas,
          restantes: [...entradasNormalizadas],
          resultados: [],
          status: 'pendente',
          criadoEm: new Date().toISOString(),
        }
        sorteios.value.unshift(novoSorteio)
        sorteioSelecionadoId.value = novoSorteio.id
      }
      fecharModalCriacao()
    }
  } else if (tipoCriacao.value === 'numero') {
    if (!formNumero.value.titulo.trim()) {
      errosCriacao.value.push('Informe um título para o sorteio.')
    }
    if (formNumero.value.de > formNumero.value.ate) {
      errosCriacao.value.push('O número inicial deve ser menor ou igual ao número final.')
    }
    if (formNumero.value.quantidadeResultados < 1) {
      errosCriacao.value.push('A quantidade de resultados deve ser maior que zero.')
    }
    if (numerosDisponiveis.value < formNumero.value.quantidadeResultados) {
      errosCriacao.value.push('A quantidade de resultados não pode ser maior que a faixa informada.')
    }

    if (errosCriacao.value.length === 0) {
      const entradasNumeros = Array.from(
        { length: numerosDisponiveis.value },
        (_, index) => String(formNumero.value.de + index),
      )
      if (modoEdicao.value) {
        atualizarSorteioEditado({
          titulo: formNumero.value.titulo.trim(),
          tipo: 'numero',
          quantidadeResultados: formNumero.value.quantidadeResultados,
          entradas: entradasNumeros,
        })
      } else {
        const novoSorteio: Sorteio = {
          id: gerarId(),
          titulo: formNumero.value.titulo.trim(),
          tipo: 'numero',
          quantidadeResultados: formNumero.value.quantidadeResultados,
          entradas: entradasNumeros,
          restantes: [...entradasNumeros],
          resultados: [],
          status: 'pendente',
          criadoEm: new Date().toISOString(),
        }
        sorteios.value.unshift(novoSorteio)
        sorteioSelecionadoId.value = novoSorteio.id
      }
      fecharModalCriacao()
    }
  }
}

const selecionarSorteio = (id: string) => {
  sorteioSelecionadoId.value = id
}

const acionarSorteio = () => {
  if (!sorteioSelecionado.value) return

  if (sorteioSelecionado.value.status === 'concluido') {
    sorteioVisualizadoId.value = sorteioSelecionado.value.id
    modalResultadosAberto.value = true
    return
  }

  if (sorteioSelecionado.value.status === 'pendente') {
    sorteioSelecionado.value.resultados = []
    sorteioSelecionado.value.restantes = [...sorteioSelecionado.value.entradas]
  }

  sorteioSelecionado.value.status = 'em_andamento'
  sorteioEmExecucaoId.value = sorteioSelecionado.value.id
  modalExecucaoAberto.value = true
}

const confirmarExclusao = () => {
  if (!sorteioSelecionado.value) return

  const remover = window.confirm(`Deseja excluir o sorteio "${sorteioSelecionado.value.titulo}"?`)
  if (!remover) return

  const idRemover = sorteioSelecionado.value.id
  sorteios.value = sorteios.value.filter((item) => item.id !== idRemover)

  if (sorteioEmExecucaoId.value === idRemover) {
    modalExecucaoAberto.value = false
    sorteioEmExecucaoId.value = null
    isSorteando.value = false
    countdown.value = null
  }

  if (sorteioVisualizadoId.value === idRemover) {
    modalResultadosAberto.value = false
    sorteioVisualizadoId.value = null
  }

  if (sorteioEmEdicaoId.value === idRemover) {
    modalCriacaoAberto.value = false
    tipoCriacao.value = null
    sorteioEmEdicaoId.value = null
  }

  sorteioSelecionadoId.value = sorteiosOrdenados.value[0]?.id ?? null
}

const sortearResultado = () => {
  if (!sorteioEmExecucao.value || !sorteioEmExecucao.value.restantes.length) return null

  const indice = Math.floor(Math.random() * sorteioEmExecucao.value.restantes.length)
  const [selecionado] = sorteioEmExecucao.value.restantes.splice(indice, 1)
  sorteioEmExecucao.value.resultados.push(selecionado)

  if (sorteioEmExecucao.value.resultados.length >= sorteioEmExecucao.value.quantidadeResultados) {
    sorteioEmExecucao.value.status = 'concluido'
  }

  return selecionado
}

const sortearProximo = () => {
  if (isSorteando.value || !podeSortear.value) return

  isSorteando.value = true
  resultadoEmDestaque.value = null
  countdown.value = 3

  if (countdownInterval) {
    window.clearInterval(countdownInterval)
  }

  countdownInterval = window.setInterval(() => {
    if (countdown.value && countdown.value > 1) {
      countdown.value -= 1
      return
    }

    if (countdownInterval) {
      window.clearInterval(countdownInterval)
      countdownInterval = null
    }
    countdown.value = null

    const resultado = sortearResultado()
    if (resultado) {
      resultadoEmDestaque.value = resultado
      dispararFogos()
    }

    isSorteando.value = false
  }, 850)
}

const fecharModalExecucao = () => {
  modalExecucaoAberto.value = false
  isSorteando.value = false
  countdown.value = null
  resultadoEmDestaque.value = null
  pararFogos()

  if (countdownInterval) {
    window.clearInterval(countdownInterval)
    countdownInterval = null
  }

  if (!sorteioEmExecucao.value) return

  if (sorteioConcluido.value) {
    sorteioEmExecucaoId.value = null
    return
  }

  sorteioEmExecucao.value.status = 'em_andamento'
}

const fecharModalResultados = () => {
  modalResultadosAberto.value = false
  sorteioVisualizadoId.value = null
}

</script>

<style scoped>
.countdown-badge {
  position: relative;
  z-index: 10;
  font-size: 6rem;
  font-weight: 800;
  line-height: 1;
  color: white;
  text-shadow: 0 10px 40px rgba(0, 0, 0, 0.35);
  animation: countdownPulse 0.9s ease-in-out infinite;
}

.resultado-badge {
  position: relative;
  z-index: 10;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 1.25rem 2.5rem;
  border-radius: 1.5rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.12);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.35);
  font-size: 6.375rem;
  font-weight: 800;
  color: white;
  animation: popIn 450ms cubic-bezier(0.34, 1.56, 0.64, 1);
  text-shadow: 0 12px 50px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(6px);
}

.fade-scale-enter-active,
.fade-scale-leave-active {
  transition: opacity 250ms ease, transform 250ms ease;
}

.fade-scale-enter-from,
.fade-scale-leave-to {
  opacity: 0;
  transform: scale(0.85);
}

@keyframes countdownPulse {
  0% {
    transform: scale(0.9);
    opacity: 0.7;
  }
  50% {
    transform: scale(1);
    opacity: 1;
  }
  100% {
    transform: scale(0.9);
    opacity: 0.7;
  }
}

@keyframes popIn {
  0% {
    transform: scale(0.6);
    opacity: 0;
  }
  80% {
    transform: scale(1.05);
    opacity: 1;
  }
  100% {
    transform: scale(1);
  }
}
</style>
