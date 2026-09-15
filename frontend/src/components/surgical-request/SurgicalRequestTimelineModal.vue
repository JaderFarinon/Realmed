<template>
  <Modal v-if="isOpen" fullScreenBackdrop @close="handleClose">
    <template #body>
      <div
        class="no-scrollbar relative flex h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-xl dark:bg-gray-900 lg:max-w-6xl xl:max-w-7xl"
      >
        <div class="flex items-start justify-between border-b border-gray-100 px-6 py-5 dark:border-gray-800">
          <div>
            <p class="text-sm font-medium uppercase tracking-wide text-brand-500">Visão da cirurgia</p>
            <h2 class="mt-1 text-2xl font-semibold text-gray-800 dark:text-white/90">
              Solicitação {{ tituloSolicitacao }}
            </h2>
            <p v-if="pacienteNome" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
              Paciente: <span class="font-medium text-gray-800 dark:text-white/90">{{ pacienteNome }}</span>
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center rounded-full border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 shadow-sm transition hover:bg-gray-50 hover:text-gray-800 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-500 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/10"
            @click="handleClose"
          >
            Fechar
          </button>
        </div>

        <div class="flex-1 overflow-y-auto px-6 py-6">
          <div class="flex flex-wrap items-center gap-2 border-b border-gray-100 pb-4 dark:border-gray-800">
            <button
              v-for="aba in abas"
              :key="aba.id"
              type="button"
              class="rounded-full px-4 py-2 text-sm font-semibold transition"
              :class="abaAtiva === aba.id
                ? 'bg-brand-500 text-white shadow-sm hover:bg-brand-600'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-white/10 dark:text-gray-300 dark:hover:bg-white/15'"
              @click="selecionarAba(aba.id)"
            >
              {{ aba.label }}
            </button>
          </div>

          <div v-if="loading" class="mt-10 flex flex-col items-center justify-center gap-3 text-gray-500 dark:text-gray-400">
            <span class="h-10 w-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-500"></span>
            <p>Carregando eventos da linha do tempo...</p>
          </div>

          <div v-else-if="errorMessage" class="mt-10 flex flex-col items-center justify-center gap-3 text-center">
            <p class="text-sm text-red-600 dark:text-red-400">{{ errorMessage }}</p>
            <button
              type="button"
              class="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white shadow hover:bg-brand-600 focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-brand-400"
              @click="recarregar"
            >
              Tentar novamente
            </button>
          </div>

          <div v-else>
            <div v-if="abaAtiva === 'timeline'">
              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="card in resumoCards"
                  :key="card.label"
                  class="rounded-xl px-4 py-3 text-sm shadow-sm"
                  :class="card.tone === 'primary'
                    ? 'border border-brand-100 bg-brand-500/10 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-white/10 dark:text-gray-200'"
                >
                  <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {{ card.label }}
                  </p>
                  <p class="mt-1 font-semibold text-gray-800 dark:text-white/90">
                    {{ card.value }}
                  </p>
                </div>
              </div>

              <div class="mt-6 rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600 dark:bg-white/[0.04] dark:text-gray-400">
                Eventos capturados incluem alterações na solicitação, vínculos de procedimentos, materiais, alergias, etapas, pendências
                e cancelamentos, ordenados cronologicamente para apoiar auditorias e esclarecimentos.
              </div>

              <div v-if="!eventosOrdenados.length" class="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Nenhum evento foi registrado para esta solicitação até o momento.
              </div>

              <div v-else class="relative mt-8 pl-10">
                <div class="absolute left-4 top-0 bottom-4 w-px bg-gray-200 dark:bg-white/10"></div>
                <ul class="space-y-8">
                  <li
                    v-for="evento in eventosOrdenados"
                    :key="evento.id"
                    class="relative rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-gray-100 transition hover:shadow-md dark:bg-gray-900 dark:ring-white/5"
                  >
                    <span
                      class="absolute -left-6 top-4 flex h-8 w-8 items-center justify-center rounded-full border-4 border-white dark:border-gray-900"
                      :class="tipoCorClasse(evento.type)"
                    >
                      <span class="h-2.5 w-2.5 rounded-full bg-white"></span>
                    </span>
                    <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{{ formatarDataHora(evento.timestamp) }}</span>
                      <span class="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-white/10 dark:text-gray-300">
                        {{ tipoEtiqueta(evento.type) }}
                      </span>
                      <span
                        v-if="evento.status_label"
                        class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/15 dark:text-blue-200"
                      >
                        {{ evento.status_label }}
                      </span>
                    </div>
                    <h3 class="mt-2 text-lg font-semibold text-gray-800 dark:text-white/90">{{ evento.title }}</h3>
                    <p v-if="evento.description" class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {{ evento.description }}
                    </p>
                    <p v-if="evento.actor" class="mt-2 text-xs font-medium text-gray-500 dark:text-gray-400">
                      Responsável: {{ evento.actor }}
                    </p>
                    <ul v-if="evento.details.length" class="mt-3 space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <li v-for="(detalhe, index) in evento.details" :key="index" class="flex items-start gap-2">
                        <span class="mt-1 h-1.5 w-1.5 flex-none rounded-full bg-gray-300 dark:bg-white/30"></span>
                        <span>{{ detalhe }}</span>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
            </div>

            <div v-else-if="abaAtiva === 'esteira'" class="mt-6">
              <div class="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p class="text-sm font-medium uppercase tracking-wide text-brand-500">Fluxo da esteira</p>
                  <h3 class="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">Progresso da cirurgia</h3>
                  <p class="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Etapas representadas como uma linha de montagem, destacando o que já foi concluído e o que ainda está pendente.
                  </p>
                </div>
                <div class="rounded-2xl border border-brand-100 bg-brand-500/10 px-4 py-3 text-right text-sm text-brand-600 shadow-sm dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200">
                  <p class="text-xs uppercase tracking-wide">Conclusão estimada</p>
                  <p class="mt-1 text-2xl font-semibold">
                    {{ percentualConclusao !== null ? percentualConclusao + '%' : '—' }}
                  </p>
                  <p class="text-xs text-brand-500/70 dark:text-brand-200/70">
                    {{ etapasConcluidas.length }} de {{ totalEtapas }} etapas concluídas
                  </p>
                </div>
              </div>

              <div v-if="!totalEtapas" class="mt-10 text-center text-sm text-gray-500 dark:text-gray-400">
                Ainda não existem eventos de etapas registrados para esta cirurgia.
              </div>

              <div v-else class="relative mt-10 min-h-[26rem] overflow-x-auto overflow-y-visible pb-8">
                <div class="absolute left-10 right-10 top-16 hidden h-0.5 bg-gray-200 dark:bg-white/10 lg:block"></div>
                <div class="flex min-w-full gap-6 px-2">
                  <div
                    v-for="(etapa, index) in etapasEsteira"
                    :key="etapa.id"
                    class="group relative flex w-72 flex-none flex-col rounded-3xl border bg-white px-5 pb-5 pt-10 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-white/10 dark:bg-gray-900"
                  >
                    <span
                      class="absolute left-1/2 top-0 -translate-y-1/2 -translate-x-1/2 flex h-12 w-12 items-center justify-center rounded-full border-4 border-white text-sm font-semibold text-white shadow-md transition group-hover:scale-105 dark:border-gray-900"
                      :class="statusClasse(etapa.status)"
                    >
                      {{ index + 1 }}
                    </span>
                    <h4 class="text-base font-semibold text-gray-800 dark:text-white/90">{{ etapa.nome }}</h4>
                    <p class="mt-1 text-xs font-medium uppercase tracking-wide" :class="statusTextoClasse(etapa.status)">
                      {{ etapa.statusLabel }}
                    </p>
                    <p v-if="etapa.descricao" class="mt-2 text-sm text-gray-600 dark:text-gray-400">{{ etapa.descricao }}</p>
                    <div class="mt-4 flex flex-wrap items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
                      <span v-if="etapa.responsavel" class="flex items-center gap-1">
                        <span class="h-2 w-2 rounded-full bg-current"></span>
                        {{ etapa.responsavel }}
                      </span>
                      <span v-if="etapa.updatedAt">Atualizado em {{ formatarDataHora(etapa.updatedAt) }}</span>
                    </div>
                    <div v-if="etapa.percentual !== null" class="mt-5">
                      <div class="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <span>Progresso</span>
                        <span class="font-semibold text-gray-700 dark:text-gray-200">{{ etapa.percentual }}%</span>
                      </div>
                      <div class="mt-1 h-2 rounded-full bg-gray-200 dark:bg-white/10">
                        <div class="h-full rounded-full bg-brand-500 transition-all" :style="{ width: etapa.percentual + '%' }"></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div v-else-if="abaAtiva === 'chat'" class="mt-6 flex h-full flex-col gap-4">
              <div class="flex-1 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-white/10 dark:bg-gray-900">
                <div v-if="carregandoChatMensagens" class="p-4 text-sm text-gray-600 dark:text-gray-300">
                  Carregando mensagens...
                </div>
                <div v-else-if="chatMensagensErro" class="flex flex-col items-start gap-3 p-4">
                  <p class="text-sm text-amber-600 dark:text-amber-300">{{ chatMensagensErro }}</p>
                  <Button size="sm" variant="outline" @click="carregarChatMensagens(true)">
                    Tentar novamente
                  </Button>
                </div>
                <div v-else-if="!chatMensagens.length" class="p-4 text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma mensagem registrada para esta cirurgia.
                </div>
                <div v-else class="flex h-full flex-col overflow-hidden p-4">
                  <ul class="flex h-full flex-col gap-4 overflow-y-auto pr-2">
                    <li
                      v-for="mensagem in chatMensagens"
                      :key="`chat-cirurgia-${mensagem.id}`"
                      class="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900"
                    >
                      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span class="font-semibold text-gray-700 dark:text-gray-200">
                          {{ mensagem.autor?.nome ?? 'Usuário' }}
                        </span>
                        <span>•</span>
                        <span>{{ formatarDataHora(mensagem.criadoEm) }}</span>
                      </div>
                      <p class="mt-2 whitespace-pre-line text-sm text-gray-800 dark:text-gray-100">
                        {{ mensagem.conteudo || 'Mensagem sem conteúdo.' }}
                      </p>
                      <ul v-if="mensagem.anexos?.length" class="mt-3 space-y-2">
                        <li
                          v-for="anexo in mensagem.anexos"
                          :key="`chat-cirurgia-anexo-${anexo.id}`"
                          class="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800/60"
                        >
                          <div class="min-w-0">
                            <p class="truncate font-medium text-gray-700 dark:text-gray-200">
                              {{ anexo.nomeOriginal ?? `Arquivo ${anexo.id}` }}
                            </p>
                            <p class="text-xs text-gray-500 dark:text-gray-400">
                              {{ formatarTamanhoArquivo(anexo.tamanhoBytes) }}
                            </p>
                          </div>
                          <Button
                            size="xs"
                            variant="outline"
                            :start-icon="DocsIcon"
                            class-name="inline-flex items-center gap-1"
                            @click="downloadChatAnexo(anexo)"
                          >
                            Visualizar
                          </Button>
                        </li>
                      </ul>
                    </li>
                  </ul>
                </div>
              </div>

              <div class="rounded-3xl border border-gray-100 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-gray-900">
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                  Nova mensagem
                </label>
                <textarea
                  v-model="novaMensagem"
                  rows="4"
                  class="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm transition focus:border-brand-500 focus:outline-hidden focus:ring-2 focus:ring-brand-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                  placeholder="Compartilhe uma atualização sobre a cirurgia"
                  @keydown="onChatKeydown"
                ></textarea>
                <p class="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  Aceitamos arquivos {{ DEFAULT_ATTACHMENT_EXTENSIONS_LABEL }} com até 25&nbsp;MB.
                </p>
                <div class="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div class="flex items-center gap-3">
                    <input
                      ref="inputChatArquivo"
                      type="file"
                      class="hidden"
                      :accept="DEFAULT_ATTACHMENT_ACCEPT"
                      @change="onChatArquivoSelecionado"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      :start-icon="PaperclipIcon"
                      class-name="inline-flex items-center gap-1"
                      :disabled="uploadChatAnexoEmAndamento || enviandoChatMensagem"
                      @click="abrirSeletorChatArquivo"
                    >
                      <template v-if="uploadChatAnexoEmAndamento">Enviando arquivo...</template>
                      <template v-else>Adicionar arquivo</template>
                    </Button>
                  </div>
                  <Button
                    class-name="w-full justify-center sm:w-auto"
                    :disabled="!podeEnviarMensagemChat"
                    @click="enviarMensagemChat"
                  >
                    <template v-if="enviandoChatMensagem">Enviando...</template>
                    <template v-else>Enviar mensagem</template>
                  </Button>
                </div>
              </div>
            </div>

            <div v-else class="mt-6 space-y-8">
              <div>
                <p class="text-sm font-medium uppercase tracking-wide text-brand-500">Indicadores principais</p>
                <h3 class="mt-1 text-xl font-semibold text-gray-800 dark:text-white/90">Dashboard da cirurgia</h3>
              </div>

              <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <div
                  v-for="card in dashboardCards"
                  :key="card.label"
                  class="rounded-xl px-4 py-3 text-sm shadow-sm"
                  :class="card.tone === 'primary'
                    ? 'border border-brand-100 bg-brand-500/10 text-brand-600 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-200'
                    : 'border border-gray-200 bg-gray-50 text-gray-700 dark:border-gray-800 dark:bg-white/10 dark:text-gray-200'"
                >
                  <p class="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    {{ card.label }}
                  </p>
                  <p class="mt-1 font-semibold text-gray-800 dark:text-white/90">
                    {{ card.value }}
                  </p>
                  <p v-if="card.helper" class="mt-2 text-xs text-gray-500 dark:text-gray-400">{{ card.helper }}</p>
                </div>
              </div>

              <div class="grid gap-6 lg:grid-cols-2">
                <div class="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
                  <h4 class="text-base font-semibold text-gray-800 dark:text-white/90">Alertas e pendências</h4>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Monitoramento das pendências e riscos identificados para acelerar a resolução.
                  </p>
                  <ul v-if="alertasCirurgia.length" class="mt-4 space-y-4">
                    <li
                      v-for="alerta in alertasCirurgia"
                      :key="alerta.id"
                      class="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 shadow-sm dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                    >
                      <div class="flex items-start justify-between gap-3">
                        <div>
                          <p class="font-semibold">{{ alerta.title }}</p>
                          <p v-if="alerta.description" class="mt-1 text-xs text-amber-700/80 dark:text-amber-200/80">{{ alerta.description }}</p>
                        </div>
                        <span class="text-xs font-semibold uppercase tracking-wide">{{ alerta.status_label ?? 'Pendência' }}</span>
                      </div>
                      <p class="mt-2 text-[11px] uppercase tracking-wide">
                        {{ formatarDataHora(alerta.timestamp) }}
                      </p>
                    </li>
                  </ul>
                  <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Nenhuma pendência ou alerta foi registrada até o momento.
                  </p>
                </div>

                <div class="rounded-3xl border border-gray-100 bg-white p-6 shadow-sm dark:border-white/10 dark:bg-gray-900">
                  <h4 class="text-base font-semibold text-gray-800 dark:text-white/90">Atividade recente</h4>
                  <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    Últimos eventos registrados para acompanhar o andamento da cirurgia.
                  </p>
                  <ul v-if="atividadeRecente.length" class="mt-4 space-y-4">
                    <li v-for="evento in atividadeRecente" :key="evento.id" class="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-white/10 dark:text-gray-200">
                      <div class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                        <span>{{ formatarDataHora(evento.timestamp) }}</span>
                        <span class="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600 dark:bg-white/20 dark:text-gray-200">
                          {{ tipoEtiqueta(evento.type) }}
                        </span>
                        <span
                          v-if="evento.status_label"
                          class="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-blue-700 dark:bg-blue-500/20 dark:text-blue-100"
                        >
                          {{ evento.status_label }}
                        </span>
                      </div>
                      <p class="mt-2 font-semibold text-gray-800 dark:text-white/90">{{ evento.title }}</p>
                      <p v-if="evento.description" class="mt-1 text-xs text-gray-600 dark:text-gray-400">{{ evento.description }}</p>
                    </li>
                  </ul>
                  <p v-else class="mt-4 text-sm text-gray-500 dark:text-gray-400">
                    Ainda não existem eventos recentes para exibir.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </Modal>
</template>

<script setup lang="ts">
import { computed, ref, watch, withDefaults } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Button from '@/components/ui/Button.vue'
import { useToast } from '@/composables/useToast'
import {
  DEFAULT_ATTACHMENT_ACCEPT,
  DEFAULT_ATTACHMENT_EXTENSIONS_LABEL,
  splitAttachmentsByValidity,
} from '@/constants/attachments'
import { PaperclipIcon, DocsIcon } from '@/icons'
import {
  fetchSurgicalRequestTimeline,
  fetchSurgicalRequestChatMessages,
  postSurgicalRequestChatMessage,
  uploadSurgicalRequestChatAttachment,
  downloadSurgicalRequestChatAttachment,
} from '@/services/surgicalRequests'
import type {
  SurgicalRequestChatAttachment,
  SurgicalRequestChatMessage,
  SurgicalRequestTimelineEvent,
  SurgicalRequestTimelineSummary,
} from '@/types/surgicalRequests'
import { openBlobInNewTab } from '@/utils/files'
import { extractSurgicalRequestId } from '@/utils/surgicalRequests'

interface Props {
  isOpen: boolean
  solicitacaoId?: string | number | null
  solicitacao?: Record<string, unknown> | null
}

const props = withDefaults(defineProps<Props>(), {
  solicitacaoId: null,
  solicitacao: null,
})

const emit = defineEmits<{ (e: 'close'): void }>()

const toast = useToast()

const eventos = ref<SurgicalRequestTimelineEvent[]>([])
const resumo = ref<SurgicalRequestTimelineSummary | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const abaAtiva = ref<'timeline' | 'chat' | 'esteira' | 'dashboard'>('timeline')

const chatMensagens = ref<SurgicalRequestChatMessage[]>([])
const carregandoChatMensagens = ref(false)
const chatMensagensErro = ref('')
let chatMensagensRequisicaoAtual = 0
const chatCarregadoParaSolicitacaoId = ref<string | null>(null)
const novaMensagem = ref('')
const enviandoChatMensagem = ref(false)
const uploadChatAnexoEmAndamento = ref(false)
const inputChatArquivo = ref<HTMLInputElement | null>(null)

const abas = [
  { id: 'timeline' as const, label: 'Linha do tempo' },
  { id: 'chat' as const, label: 'Chat' },
  { id: 'esteira' as const, label: 'Esteira' },
  { id: 'dashboard' as const, label: 'Dashboard' },
]

type AbaId = (typeof abas)[number]['id']

type EsteiraStatus = 'concluida' | 'pendente' | 'andamento' | 'cancelada' | 'indefinido'

interface EsteiraEtapa {
  id: string
  nome: string
  status: EsteiraStatus
  statusLabel: string
  descricao: string | null
  updatedAt: string | null
  responsavel: string | null
  percentual: number | null
  ordem: number | null
}

interface EsteiraEtapaInterna extends EsteiraEtapa {
  referenciaTemporal: number
}

interface CardResumo {
  label: string
  value: string
  tone?: 'primary' | 'neutral'
  helper?: string
}

const tipoEtiquetas: Record<string, string> = {
  solicitacao: 'Solicitação',
  procedimento: 'Procedimento',
  material: 'Material',
  instrumentador: 'Instrumentador',
  'alergia-medicamento': 'Alergia (Medicamento)',
  'alergia-alimento': 'Alergia (Alimento)',
  etapa: 'Etapa',
  pendencia: 'Pendência',
  cancelamento: 'Cancelamento',
}

const tipoCores: Record<string, string> = {
  solicitacao: 'bg-brand-500',
  procedimento: 'bg-purple-500',
  material: 'bg-amber-500',
  instrumentador: 'bg-emerald-500',
  'alergia-medicamento': 'bg-rose-500',
  'alergia-alimento': 'bg-lime-500',
  etapa: 'bg-indigo-500',
  pendencia: 'bg-orange-500',
  cancelamento: 'bg-red-600',
}

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
})

const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
})

const selecionarAba = (id: AbaId) => {
  abaAtiva.value = id
}

const resetarEstado = () => {
  eventos.value = []
  resumo.value = null
  errorMessage.value = ''
  loading.value = false
  abaAtiva.value = 'timeline'
  resetarChat()
}

const carregarTimeline = async () => {
  const id = props.solicitacaoId ?? extractSurgicalRequestId(props.solicitacao ?? {})
  if (!id) {
    eventos.value = []
    resumo.value = null
    return
  }

  loading.value = true
  errorMessage.value = ''

  try {
    const data = await fetchSurgicalRequestTimeline(id)
    resumo.value = data.solicitacao
    eventos.value = Array.isArray(data.eventos) ? data.eventos : []
  } catch (error) {
    console.error('Erro ao carregar linha do tempo da solicitação', error)
    errorMessage.value = 'Não foi possível carregar a linha do tempo. Verifique sua conexão e tente novamente.'
  } finally {
    loading.value = false
  }
}

const recarregar = () => {
  void carregarTimeline()
}

watch(
  () => props.isOpen,
  (aberto) => {
    if (aberto) {
      abaAtiva.value = 'timeline'
      resetarChat()
      void carregarTimeline()
    } else {
      resetarEstado()
    }
  },
)

watch(
  () => props.solicitacaoId,
  (novo, antigo) => {
    if (!props.isOpen) {
      return
    }
    if (novo === antigo) {
      return
    }
    resetarChat()
    void carregarTimeline()
    if (abaAtiva.value === 'chat') {
      void carregarChatMensagens(true)
    }
  },
)

watch(
  () => abaAtiva.value,
  (aba) => {
    if (aba === 'chat') {
      void carregarChatMensagens()
    }
  },
)

const timelineResumo = computed(() => resumo.value)

const solicitacaoNumero = computed(() => {
  if (timelineResumo.value?.numero_liberacao) {
    return timelineResumo.value.numero_liberacao
  }

  const id = extractSurgicalRequestId(props.solicitacao ?? {})
  if (id) {
    return id
  }

  if (timelineResumo.value?.id) {
    return `#${timelineResumo.value.id}`
  }

  return ''
})

const resumoIdentificador = computed(() => {
  if (timelineResumo.value?.id) {
    return `#${timelineResumo.value.id}`
  }
  const id = extractSurgicalRequestId(props.solicitacao ?? {})
  return id ? `#${id}` : ''
})

const tituloSolicitacao = computed(() => {
  const numero = solicitacaoNumero.value || resumoIdentificador.value
  if (numero && numero.trim().length) {
    return numero
  }
  return '—'
})

const pacienteNome = computed(() => {
  if (timelineResumo.value?.nome_paciente) {
    return timelineResumo.value.nome_paciente
  }

  if (!props.solicitacao) {
    return ''
  }

  const campos = ['nome_paciente', 'paciente', 'patient', 'patient_name']
  for (const campo of campos) {
    const valor = props.solicitacao?.[campo]
    if (valor) {
      const texto = String(valor).trim()
      if (texto.length) {
        return texto
      }
    }
  }

  return ''
})

const obterNumero = (valor: unknown): number | null => {
  if (typeof valor === 'number' && Number.isFinite(valor)) {
    return valor
  }
  if (typeof valor === 'string') {
    const normalizado = valor.replace(',', '.')
    const numero = Number.parseFloat(normalizado)
    if (Number.isFinite(numero)) {
      return numero
    }
  }
  return null
}

const normalizarPercentual = (valor: unknown): number | null => {
  const numero = obterNumero(valor)
  if (numero === null) {
    return null
  }
  return Math.max(0, Math.min(100, Math.round(numero)))
}

const obterTimestamp = (valor: string | null | undefined): number => {
  if (!valor) {
    return 0
  }
  const data = new Date(valor)
  const tempo = data.getTime()
  return Number.isNaN(tempo) ? 0 : tempo
}

const classificarStatusEtapa = (valor: unknown): EsteiraStatus => {
  if (!valor) {
    return 'indefinido'
  }
  const texto = String(valor).trim().toLowerCase()
  if (!texto.length) {
    return 'indefinido'
  }
  if (texto.includes('cancel')) {
    return 'cancelada'
  }
  if (texto.includes('pend')) {
    return 'pendente'
  }
  if (texto.includes('final') || texto.includes('conclu') || texto.includes('feito') || texto.includes('realizad') || texto.includes('complet')) {
    return 'concluida'
  }
  if (texto.includes('andamento') || texto.includes('progres') || texto.includes('process') || texto.includes('execut')) {
    return 'andamento'
  }
  return 'indefinido'
}

const statusClasse = (status: EsteiraStatus) => {
  switch (status) {
    case 'concluida':
      return 'bg-emerald-500'
    case 'andamento':
      return 'bg-brand-500'
    case 'pendente':
      return 'bg-amber-500'
    case 'cancelada':
      return 'bg-rose-500'
    default:
      return 'bg-gray-400'
  }
}

const statusTextoClasse = (status: EsteiraStatus) => {
  switch (status) {
    case 'concluida':
      return 'text-emerald-600 dark:text-emerald-200'
    case 'andamento':
      return 'text-brand-600 dark:text-brand-200'
    case 'pendente':
      return 'text-amber-600 dark:text-amber-300'
    case 'cancelada':
      return 'text-rose-600 dark:text-rose-300'
    default:
      return 'text-gray-500 dark:text-gray-400'
  }
}

const formatarData = (valor: string | null | undefined) => {
  if (!valor) {
    return ''
  }
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return ''
  }
  return dateFormatter.format(data)
}

const formatarDataHora = (valor: string | null | undefined) => {
  if (!valor) {
    return 'Data não informada'
  }
  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return 'Data não informada'
  }
  return dateTimeFormatter.format(data)
}

const formatarTamanhoArquivo = (tamanho: number | null | undefined) => {
  if (tamanho === undefined || tamanho === null) {
    return '-'
  }

  const numero = Number(tamanho)
  if (!Number.isFinite(numero)) {
    return '-'
  }

  if (numero === 0) {
    return '0 B'
  }

  const unidades = ['B', 'KB', 'MB', 'GB', 'TB']
  let valor = numero
  let indice = 0

  while (valor >= 1024 && indice < unidades.length - 1) {
    valor /= 1024
    indice += 1
  }

  const casasDecimais = valor >= 10 || indice === 0 ? 0 : 1
  return `${valor.toFixed(casasDecimais)} ${unidades[indice]}`
}

const textoNaoVazioOuNull = (valor: unknown): string | null => {
  if (valor === undefined || valor === null) {
    return null
  }
  const texto = String(valor).trim()
  return texto.length ? texto : null
}

const numeroPositivoOuNull = (valor: unknown): number | null => {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) {
    return null
  }
  const inteiro = Math.trunc(numero)
  return inteiro > 0 ? inteiro : null
}

const numeroNaoNegativoOuNull = (valor: unknown): number | null => {
  const numero = Number(valor)
  if (!Number.isFinite(numero)) {
    return null
  }
  return numero >= 0 ? numero : null
}

const normalizarChatAnexoResposta = (
  entrada: unknown,
): SurgicalRequestChatAttachment | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, unknown>
  const id = numeroPositivoOuNull(bruto.id)
  if (!id) {
    return null
  }

  const nomeOriginal =
    textoNaoVazioOuNull(bruto.nomeOriginal) ??
    textoNaoVazioOuNull(bruto.nome_original) ??
    textoNaoVazioOuNull(bruto.nome) ??
    null

  const mimeType =
    textoNaoVazioOuNull(bruto.mimeType) ??
    textoNaoVazioOuNull(bruto.mime_type) ??
    textoNaoVazioOuNull(bruto.tipo) ??
    null

  const tamanhoBytes =
    numeroNaoNegativoOuNull(bruto.tamanhoBytes) ??
    numeroNaoNegativoOuNull(bruto.tamanho_bytes) ??
    numeroNaoNegativoOuNull(bruto.tamanho) ??
    null

  const criadoEm =
    textoNaoVazioOuNull(bruto.criadoEm) ??
    textoNaoVazioOuNull(bruto.criado_em) ??
    textoNaoVazioOuNull(bruto.created_at) ??
    textoNaoVazioOuNull(bruto.createdAt) ??
    null

  return {
    id,
    nomeOriginal,
    mimeType,
    tamanhoBytes,
    criadoEm,
  }
}

const normalizarChatMensagemResposta = (
  entrada: unknown,
): SurgicalRequestChatMessage | null => {
  if (!entrada || typeof entrada !== 'object') {
    return null
  }

  const bruto = entrada as Record<string, unknown>
  const id = numeroPositivoOuNull(bruto.id)
  if (!id) {
    return null
  }

  const conteudo =
    textoNaoVazioOuNull(bruto.conteudo) ??
    textoNaoVazioOuNull(bruto.mensagem) ??
    textoNaoVazioOuNull(bruto.content) ??
    textoNaoVazioOuNull(bruto.texto) ??
    ''

  const criadoEm =
    textoNaoVazioOuNull(bruto.criadoEm) ??
    textoNaoVazioOuNull(bruto.criado_em) ??
    textoNaoVazioOuNull(bruto.created_at) ??
    textoNaoVazioOuNull(bruto.createdAt) ??
    textoNaoVazioOuNull(bruto.data) ??
    null

  let autor: { id: number | null; nome: string | null } | null = null
  const autorBruto = bruto.autor
  if (autorBruto && typeof autorBruto === 'object') {
    const autorObjeto = autorBruto as Record<string, unknown>
    const autorId = numeroPositivoOuNull(autorObjeto.id)
    const autorNome =
      textoNaoVazioOuNull(autorObjeto.nome) ??
      textoNaoVazioOuNull(autorObjeto.nome_completo) ??
      textoNaoVazioOuNull(autorObjeto.full_name) ??
      textoNaoVazioOuNull(autorObjeto.username) ??
      textoNaoVazioOuNull(autorObjeto.usuario) ??
      null
    if (autorId || autorNome) {
      autor = { id: autorId ?? null, nome: autorNome }
    }
  }

  if (!autor) {
    const autorNomeFallback =
      textoNaoVazioOuNull(bruto.autor_nome) ??
      textoNaoVazioOuNull(bruto.usuario_nome) ??
      textoNaoVazioOuNull(bruto.usuario) ??
      null
    if (autorNomeFallback) {
      autor = { id: null, nome: autorNomeFallback }
    }
  }

  const anexosEntrada = Array.isArray(bruto.anexos)
    ? bruto.anexos
    : Array.isArray(bruto.attachments)
      ? bruto.attachments
      : []

  const anexos = anexosEntrada
    .map((item) => normalizarChatAnexoResposta(item))
    .filter((anexo): anexo is SurgicalRequestChatAttachment => Boolean(anexo))

  return {
    id,
    conteudo,
    criadoEm,
    autor,
    anexos,
  }
}

const obterSolicitacaoId = (): string | null => {
  const direto = props.solicitacaoId
  if (direto !== null && direto !== undefined) {
    const textoDireto = String(direto).trim()
    if (textoDireto.length) {
      return textoDireto
    }
  }

  const extraido = extractSurgicalRequestId(props.solicitacao ?? {})
  if (extraido !== null && extraido !== undefined) {
    const textoExtraido = String(extraido).trim()
    if (textoExtraido.length) {
      return textoExtraido
    }
  }

  const resumoId = resumo.value?.id
  if (resumoId !== null && resumoId !== undefined) {
    const textoResumo = String(resumoId).trim()
    if (textoResumo.length) {
      return textoResumo
    }
  }

  return null
}

const podeEnviarMensagemChat = computed(
  () => Boolean(novaMensagem.value.trim().length) && !enviandoChatMensagem.value,
)

const abrirSeletorChatArquivo = () => {
  if (uploadChatAnexoEmAndamento.value) {
    return
  }
  if (enviandoChatMensagem.value) {
    return
  }
  if (inputChatArquivo.value) {
    inputChatArquivo.value.value = ''
    inputChatArquivo.value.click()
  }
}

const onChatKeydown = (event: KeyboardEvent) => {
  if (event.key !== 'Enter' || event.shiftKey) {
    return
  }
  event.preventDefault()
  void enviarMensagemChat()
}

const resetarChat = () => {
  chatMensagensRequisicaoAtual += 1
  chatMensagens.value = []
  chatMensagensErro.value = ''
  carregandoChatMensagens.value = false
  enviandoChatMensagem.value = false
  uploadChatAnexoEmAndamento.value = false
  chatCarregadoParaSolicitacaoId.value = null
  novaMensagem.value = ''
  if (inputChatArquivo.value) {
    inputChatArquivo.value.value = ''
  }
}

const carregarChatMensagens = async (forcar = false) => {
  const solicitacaoId = obterSolicitacaoId()
  if (!solicitacaoId) {
    chatMensagens.value = []
    chatMensagensErro.value =
      'Não foi possível identificar a solicitação selecionada para carregar o chat.'
    return
  }

  if (
    !forcar &&
    chatCarregadoParaSolicitacaoId.value === solicitacaoId &&
    chatMensagens.value.length &&
    !chatMensagensErro.value
  ) {
    return
  }

  const requisicaoId = ++chatMensagensRequisicaoAtual
  carregandoChatMensagens.value = true
  chatMensagensErro.value = ''

  try {
    const lista = await fetchSurgicalRequestChatMessages(solicitacaoId)
    if (requisicaoId !== chatMensagensRequisicaoAtual) {
      return
    }

    const normalizados = lista
      .map((item) => normalizarChatMensagemResposta(item))
      .filter((mensagem): mensagem is SurgicalRequestChatMessage => Boolean(mensagem))

    chatMensagens.value = normalizados
    chatCarregadoParaSolicitacaoId.value = solicitacaoId
  } catch (error: any) {
    if (requisicaoId === chatMensagensRequisicaoAtual) {
      chatMensagens.value = []
      chatMensagensErro.value =
        error?.response?.data?.error || 'Não foi possível carregar o chat da cirurgia.'
    }
    console.error('Erro ao carregar mensagens do chat da cirurgia', error)
  } finally {
    if (requisicaoId === chatMensagensRequisicaoAtual) {
      carregandoChatMensagens.value = false
    }
  }
}

const enviarMensagemChat = async () => {
  const mensagem = novaMensagem.value.trim()
  if (!mensagem || enviandoChatMensagem.value) {
    return
  }

  const solicitacaoId = obterSolicitacaoId()
  if (!solicitacaoId) {
    toast.error('Não foi possível identificar a solicitação para enviar a mensagem.')
    return
  }

  enviandoChatMensagem.value = true

  try {
    await postSurgicalRequestChatMessage(solicitacaoId, mensagem)
    novaMensagem.value = ''
    await carregarChatMensagens(true)
    toast.success('Mensagem registrada no chat da cirurgia.')
  } catch (error: any) {
    console.error('Erro ao enviar mensagem do chat da cirurgia', error)
    const mensagemErro =
      error?.response?.data?.error || 'Não foi possível enviar a mensagem. Tente novamente.'
    toast.error(mensagemErro)
  } finally {
    enviandoChatMensagem.value = false
  }
}

const enviarChatAnexo = async (arquivo: File) => {
  if (!arquivo || uploadChatAnexoEmAndamento.value) {
    return
  }

  const solicitacaoId = obterSolicitacaoId()
  if (!solicitacaoId) {
    toast.error('Não foi possível identificar a solicitação para enviar o arquivo.')
    return
  }

  uploadChatAnexoEmAndamento.value = true

  try {
    await uploadSurgicalRequestChatAttachment(solicitacaoId, arquivo)
    await carregarChatMensagens(true)
    toast.success('Arquivo enviado para o chat da cirurgia.')
  } catch (error: any) {
    console.error('Erro ao enviar arquivo para o chat da cirurgia', error)
    const mensagemErro =
      error?.response?.data?.error || 'Não foi possível enviar o arquivo. Tente novamente.'
    toast.error(mensagemErro)
  } finally {
    uploadChatAnexoEmAndamento.value = false
  }
}

const onChatArquivoSelecionado = async (event: Event) => {
  const input = event.target as HTMLInputElement | null
  const arquivos = input?.files ? Array.from(input.files) : []

  if (input) {
    input.value = ''
  }

  if (!arquivos.length) {
    return
  }

  const { valid, invalid } = splitAttachmentsByValidity(arquivos)
  if (invalid.length) {
    toast.error(
      `Alguns arquivos foram ignorados. Permitidos: ${DEFAULT_ATTACHMENT_EXTENSIONS_LABEL}.`,
    )
  }

  const primeiroValido = valid[0]
  if (!primeiroValido) {
    return
  }

  await enviarChatAnexo(primeiroValido)
}

const downloadChatAnexo = async (anexo: SurgicalRequestChatAttachment) => {
  const solicitacaoId = obterSolicitacaoId()
  if (!solicitacaoId) {
    toast.error('Não foi possível identificar a solicitação para baixar o arquivo.')
    return
  }

  try {
    const { data } = await downloadSurgicalRequestChatAttachment(solicitacaoId, anexo.id)
    const blob = new Blob([data], {
      type: anexo.mimeType || 'application/octet-stream',
    })
    openBlobInNewTab(blob)
  } catch (error: any) {
    console.error('Erro ao abrir arquivo do chat da cirurgia', error)
    const mensagemErro =
      error?.response?.data?.error || 'Não foi possível visualizar o arquivo selecionado.'
    toast.error(mensagemErro)
  }
}

const statusLabel = computed(() => timelineResumo.value?.status_label ?? null)

const dataSolicitacao = computed(() => formatarData(timelineResumo.value?.data_solicitacao))
const dataCirurgia = computed(() => {
  const valor = formatarDataHora(timelineResumo.value?.data_cirurgia)
  return valor === 'Data não informada' ? '' : valor
})

const ultimaAtualizacao = computed(() => {
  const valor = formatarDataHora(timelineResumo.value?.updated_at)
  return valor === 'Data não informada' ? '' : valor
})

const resumoCards = computed<CardResumo[]>(() => {
  const cards: CardResumo[] = []

  if (tituloSolicitacao.value) {
    cards.push({ label: 'Solicitação', value: tituloSolicitacao.value })
  }

  if (statusLabel.value) {
    cards.push({ label: 'Status', value: statusLabel.value, tone: 'primary' })
  }

  if (ultimaAtualizacao.value) {
    cards.push({ label: 'Última atualização', value: ultimaAtualizacao.value })
  }

  if (dataSolicitacao.value) {
    cards.push({ label: 'Data de criação', value: dataSolicitacao.value })
  }

  if (dataCirurgia.value) {
    cards.push({ label: 'Cirurgia prevista', value: dataCirurgia.value })
  }

  if (timelineResumo.value?.medico) {
    cards.push({ label: 'Médico', value: timelineResumo.value.medico })
  }

  if (timelineResumo.value?.fornecedor) {
    cards.push({ label: 'Fornecedor', value: timelineResumo.value.fornecedor })
  }

  return cards
})

const ordenarEventos = (lista: SurgicalRequestTimelineEvent[]) => {
  return [...lista].sort((a, b) => {
    const dataA = a.timestamp ? new Date(a.timestamp).getTime() : Number.POSITIVE_INFINITY
    const dataB = b.timestamp ? new Date(b.timestamp).getTime() : Number.POSITIVE_INFINITY

    if (dataA !== dataB) {
      return dataA - dataB
    }

    return a.id.localeCompare(b.id)
  })
}

const eventosOrdenados = computed(() => ordenarEventos(eventos.value))

const tipoEtiqueta = (tipo: string) => tipoEtiquetas[tipo] ?? 'Evento'
const tipoCorClasse = (tipo: string) => tipoCores[tipo] ?? 'bg-gray-400'

const etapasEsteira = computed<EsteiraEtapa[]>(() => {
  const mapa = new Map<string, EsteiraEtapaInterna>()

  for (const evento of eventosOrdenados.value) {
    const tipoEvento = (evento.type ?? '').toLowerCase()
    const categoriaEvento = (evento.category ?? '').toLowerCase()
    if (tipoEvento !== 'etapa' && categoriaEvento !== 'etapa') {
      continue
    }

    const contexto = (evento.context ?? {}) as Record<string, unknown>
    const idContexto = contexto?.etapa_id ?? contexto?.id ?? evento.entity_id ?? evento.id
    const id = String(idContexto ?? evento.id)

    const nomeBruto = contexto?.etapa_nome ?? contexto?.nome ?? evento.title ?? `Etapa ${id}`
    const descricaoBruta = contexto?.descricao ?? contexto?.description ?? evento.description ?? null
    const statusOriginal = contexto?.status ?? contexto?.status_original ?? evento.status ?? evento.status_label ?? ''
    const statusLabel = String(
      contexto?.status_label ?? evento.status_label ?? statusOriginal ?? 'Status não informado',
    )
    const status = classificarStatusEtapa(statusOriginal)
    const responsavel = contexto?.responsavel ?? contexto?.responsible ?? evento.actor ?? null
    const atualizadoEm = (contexto?.updated_at ?? contexto?.data ?? evento.timestamp ?? null) as string | null
    const percentual = normalizarPercentual(
      contexto?.percentual_conclusao ?? contexto?.percentual ?? contexto?.progresso ?? contexto?.progress ?? null,
    )
    const ordem = obterNumero(contexto?.ordem ?? contexto?.order ?? contexto?.sequencia ?? contexto?.sequence ?? contexto?.posicao ?? null)
    const referenciaTemporal = obterTimestamp(atualizadoEm ?? evento.timestamp)

    const etapa: EsteiraEtapaInterna = {
      id,
      nome: String(nomeBruto),
      descricao: descricaoBruta ? String(descricaoBruta) : null,
      status,
      statusLabel,
      responsavel: responsavel ? String(responsavel) : null,
      updatedAt: atualizadoEm ?? (evento.timestamp ?? null),
      percentual,
      ordem,
      referenciaTemporal,
    }

    const existente = mapa.get(id)
    if (!existente || etapa.referenciaTemporal >= existente.referenciaTemporal) {
      mapa.set(id, etapa)
    }
  }

  const etapasOrdenadas = Array.from(mapa.values()).sort((a, b) => {
    if (a.ordem !== null && b.ordem !== null && a.ordem !== b.ordem) {
      return a.ordem - b.ordem
    }
    if (a.ordem !== null && b.ordem === null) {
      return -1
    }
    if (a.ordem === null && b.ordem !== null) {
      return 1
    }
    if (a.referenciaTemporal !== b.referenciaTemporal) {
      return a.referenciaTemporal - b.referenciaTemporal
    }
    return a.nome.localeCompare(b.nome)
  })

  return etapasOrdenadas.map(({ referenciaTemporal, ...etapa }) => etapa)
})

const totalEtapas = computed(() => etapasEsteira.value.length)
const etapasConcluidas = computed(() => etapasEsteira.value.filter((etapa) => etapa.status === 'concluida'))
const etapasPendentes = computed(() => etapasEsteira.value.filter((etapa) => etapa.status === 'pendente'))
const etapasEmAndamento = computed(() => etapasEsteira.value.filter((etapa) => etapa.status === 'andamento'))

const percentualConclusao = computed(() => {
  const etapas = etapasEsteira.value
  if (!etapas.length) {
    return null
  }

  const comPercentual = etapas.filter((etapa) => etapa.percentual !== null)
  if (comPercentual.length) {
    const total = comPercentual.reduce((soma, etapa) => soma + (etapa.percentual ?? 0), 0)
    return Math.round(total / comPercentual.length)
  }

  const proporcao = etapasConcluidas.value.length / etapas.length
  return Math.round(proporcao * 100)
})

const atividadeRecente = computed(() => {
  if (!eventosOrdenados.value.length) {
    return [] as SurgicalRequestTimelineEvent[]
  }
  return [...eventosOrdenados.value].slice(-5).reverse()
})

const eventoEhAlerta = (evento: SurgicalRequestTimelineEvent) => {
  const tipo = (evento.type ?? '').toLowerCase()
  if (tipo.includes('pend')) {
    return true
  }
  if (tipo.includes('cancel')) {
    return true
  }
  const status = (evento.status ?? evento.status_label ?? '').toLowerCase()
  if (status.includes('pend') || status.includes('atras') || status.includes('bloque')) {
    return true
  }
  return false
}

const alertasCirurgia = computed(() => {
  const alertas = eventosOrdenados.value.filter((evento) => eventoEhAlerta(evento))
  if (!alertas.length) {
    return [] as SurgicalRequestTimelineEvent[]
  }
  return alertas.slice(-6).reverse()
})

const dashboardCards = computed<CardResumo[]>(() => {
  const cards: CardResumo[] = []

  cards.push({
    label: 'Progresso da cirurgia',
    value: percentualConclusao.value !== null ? `${percentualConclusao.value}%` : '—',
    tone: 'primary',
    helper: totalEtapas.value
      ? `${etapasConcluidas.value.length} de ${totalEtapas.value} etapas concluídas`
      : 'Aguardando dados da esteira para calcular o progresso.',
  })

  cards.push({
    label: 'Total de eventos',
    value: eventosOrdenados.value.length.toString(),
    helper: atividadeRecente.value.length ? 'Últimos registros destacados abaixo.' : undefined,
  })

  cards.push({
    label: 'Etapas pendentes',
    value: etapasPendentes.value.length.toString(),
    helper:
      etapasPendentes.value.length
        ? `Pendentes: ${etapasPendentes.value
            .slice(0, 3)
            .map((etapa) => etapa.nome)
            .join(', ')}${etapasPendentes.value.length > 3 ? '…' : ''}`
        : 'Nenhuma etapa pendente registrada.',
  })

  if (etapasEmAndamento.value.length) {
    cards.push({
      label: 'Etapas em andamento',
      value: etapasEmAndamento.value.length.toString(),
      helper: etapasEmAndamento.value
        .slice(0, 2)
        .map((etapa) => etapa.nome)
        .join(', ') || undefined,
    })
  }

  for (const card of resumoCards.value) {
    cards.push(card)
  }

  return cards
})

const handleClose = () => {
  emit('close')
}
</script>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
