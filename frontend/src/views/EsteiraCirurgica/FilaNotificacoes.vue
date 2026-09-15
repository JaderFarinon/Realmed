<template>
  <AdminLayout>
    <div class="space-y-6 p-6">
      <section class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
            {{ route.meta.title }}
          </h1>
          <p class="mt-1 max-w-2xl text-sm text-gray-600 dark:text-gray-300">
            Acompanhe e monitore as notificações automáticas geradas pela esteira cirúrgica.
          </p>
        </div>

        <div class="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div class="flex flex-col text-sm">
            <label class="text-xs font-medium text-gray-600 dark:text-gray-300" for="filtro-status">
              Status
            </label>
            <select
              id="filtro-status"
              v-model="statusFiltro"
              class="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
            >
              <option v-for="opcao in STATUS_OPTIONS" :key="opcao.value" :value="opcao.value">
                {{ opcao.label }}
              </option>
            </select>
          </div>

          <button
            type="button"
            class="inline-flex items-center justify-center gap-2 rounded-lg border border-primary bg-white px-4 py-2 text-sm font-medium text-primary transition hover:bg-primary/10 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 dark:border-primary-light dark:bg-white dark:text-primary-900 dark:hover:bg-primary-light/20 dark:focus:ring-primary-light dark:focus:ring-offset-gray-900"
            :disabled="carregando"
            @click="carregarNotificacoes"
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
      </section>

      <section class="space-y-4">
        <div
          v-if="erro"
          class="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 shadow-sm dark:border-red-400/50 dark:bg-red-950/40 dark:text-red-200"
        >
          {{ erro }}
        </div>

        <div
          v-if="carregando"
          class="rounded-lg border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <div class="h-5 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div class="mt-4 space-y-2">
            <div class="h-4 w-full animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div class="h-4 w-11/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
            <div class="h-4 w-10/12 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          </div>
        </div>

        <div
          v-else
          class="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-800"
        >
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-900/40">
              <tr class="text-left text-xs font-semibold uppercase tracking-wide text-gray-600 dark:text-gray-300">
                <th scope="col" class="px-4 py-3">Status</th>
                <th scope="col" class="px-4 py-3">Assunto</th>
                <th scope="col" class="px-4 py-3">Contexto</th>
                <th scope="col" class="px-4 py-3">Destinatários</th>
                <th scope="col" class="px-4 py-3">Agendado</th>
                <th scope="col" class="px-4 py-3">Enviado</th>
                <th scope="col" class="px-4 py-3">Criado</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 text-sm text-gray-700 dark:divide-gray-700 dark:text-gray-200">
              <tr v-if="!notificacoes.length">
                <td colspan="7" class="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                  Nenhuma notificação encontrada para os filtros selecionados.
                </td>
              </tr>

              <tr v-for="notificacao in notificacoes" :key="notificacao.id" class="align-top">
                <td class="px-4 py-3">
                  <span :class="['inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium', obterStatusClasse(notificacao.status)]">
                    {{ obterStatusRotulo(notificacao.status) }}
                  </span>
                  <p class="mt-2 text-[11px] text-gray-500 dark:text-gray-400">
                    {{ formatarTipo(notificacao.tipo) }}
                  </p>
                  <p v-if="notificacao.erroEnvio" class="mt-2 text-[11px] text-red-600 dark:text-red-300">
                    {{ notificacao.erroEnvio }}
                  </p>
                </td>

                <td class="px-4 py-3">
                  <p class="font-medium text-gray-800 dark:text-gray-100">{{ notificacao.assunto }}</p>
                  <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {{ resumoConteudo(notificacao.mensagemHtml) }}
                  </p>
                </td>

                <td class="px-4 py-3">
                  <div class="space-y-1 text-xs text-gray-600 dark:text-gray-300">
                    <p v-if="notificacao.solicitacao">
                      <span class="font-semibold">Solicitação:</span>
                      #{{ notificacao.solicitacao.id }}
                    </p>
                    <p v-if="notificacao.solicitacao?.paciente">
                      <span class="font-semibold">Paciente:</span>
                      {{ notificacao.solicitacao.paciente }}
                    </p>
                    <p v-if="notificacao.etapa">
                      <span class="font-semibold">Etapa:</span>
                      {{ notificacao.etapa.nome || `ID ${notificacao.etapa.id}` }}
                    </p>
                  </div>
                </td>

                <td class="px-4 py-3">
                  <ul class="space-y-1 text-xs">
                    <li
                      v-for="destinatario in notificacao.destinatarios"
                      :key="`${notificacao.id}-${destinatario.id}`"
                      class="rounded border border-gray-200 bg-gray-50 px-2 py-1 text-gray-700 dark:border-gray-600 dark:bg-gray-900/40 dark:text-gray-200"
                    >
                      <div class="flex items-center justify-between gap-2">
                        <span class="font-medium">{{ destinatario.email || 'Sem e-mail' }}</span>
                        <span :class="['rounded-full px-2 py-0.5 text-[10px] font-semibold', obterStatusDestinatarioClasse(destinatario.status)]">
                          {{ obterStatusDestinatarioRotulo(destinatario.status) }}
                        </span>
                      </div>
                      <p v-if="destinatario.erroEnvio" class="mt-1 text-[10px] text-red-600 dark:text-red-300">
                        {{ destinatario.erroEnvio }}
                      </p>
                    </li>
                  </ul>
                </td>

                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                  {{ formatarData(notificacao.scheduledAt) || '-' }}
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                  {{ formatarData(notificacao.enviadoEm) || '-' }}
                </td>
                <td class="px-4 py-3 text-xs text-gray-600 dark:text-gray-300">
                  {{ formatarData(notificacao.createdAt) || '-' }}
                </td>
              </tr>
            </tbody>
          </table>

          <div
            class="flex flex-col items-center justify-between gap-3 border-t border-gray-200 bg-gray-50 px-4 py-3 text-xs text-gray-600 dark:border-gray-700 dark:bg-gray-900/40 dark:text-gray-300 sm:flex-row"
          >
            <div>
              Exibindo
              <strong>{{ notificacoes.length }}</strong>
              de
              <strong>{{ paginacao.total }}</strong>
              notificações
            </div>

            <div class="flex items-center gap-3">
              <button
                type="button"
                class="rounded-lg border border-gray-200 px-3 py-1 font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:hover:bg-gray-800"
                :disabled="paginacao.page <= 1 || carregando"
                @click="alterarPagina(paginacao.page - 1)"
              >
                Anterior
              </button>
              <span>
                Página <strong>{{ paginacao.page }}</strong> de {{ totalPaginas }}
              </span>
              <button
                type="button"
                class="rounded-lg border border-gray-200 px-3 py-1 font-medium transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-600 dark:hover:bg-gray-800"
                :disabled="paginacao.page >= totalPaginas || carregando"
                @click="alterarPagina(paginacao.page + 1)"
              >
                Próxima
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  </AdminLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import AdminLayout from '@/components/layout/AdminLayout.vue'
import { fetchNotificationQueue } from '@/services/esteiraNotificacoes'
import type { NotificationItem, NotificationStatus } from '@/types/esteiraNotificacoes'

const STATUS_OPTIONS: { label: string; value: NotificationStatus | 'TODOS' }[] = [
  { label: 'Todos', value: 'TODOS' },
  { label: 'Pendentes', value: 'PENDENTE' },
  { label: 'Em envio', value: 'ENVIANDO' },
  { label: 'Enviados', value: 'ENVIADO' },
  { label: 'Com falha', value: 'FALHA' },
]

const STATUS_LABELS: Record<NotificationStatus, string> = {
  PENDENTE: 'Pendente',
  ENVIANDO: 'Enviando',
  ENVIADO: 'Enviado',
  FALHA: 'Falha',
}

const STATUS_CLASSES: Record<NotificationStatus, string> = {
  PENDENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  ENVIANDO: 'bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-200',
  ENVIADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  FALHA: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
}

const DESTINATARIO_STATUS_CLASSES: Record<'PENDENTE' | 'ENVIADO' | 'FALHA', string> = {
  PENDENTE: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  ENVIADO: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200',
  FALHA: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-200',
}

const route = useRoute()

const notificacoes = ref<NotificationItem[]>([])
const paginacao = ref({ page: 1, pageSize: 20, total: 0 })
const statusFiltro = ref<NotificationStatus | 'TODOS'>('PENDENTE')
const carregando = ref(false)
const erro = ref('')

const totalPaginas = computed(() => {
  if (!paginacao.value.pageSize) {
    return 1
  }
  return Math.max(1, Math.ceil(paginacao.value.total / paginacao.value.pageSize))
})

const formatarData = (valor: string | null) => {
  if (!valor) {
    return null
  }

  const data = new Date(valor)
  if (Number.isNaN(data.getTime())) {
    return null
  }

  return data.toLocaleString('pt-BR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const obterStatusRotulo = (status: NotificationStatus) => STATUS_LABELS[status] || status
const obterStatusClasse = (status: NotificationStatus) => STATUS_CLASSES[status] || STATUS_CLASSES.PENDENTE
const obterStatusDestinatarioRotulo = (status: 'PENDENTE' | 'ENVIADO' | 'FALHA') => STATUS_LABELS[status as NotificationStatus] || status
const obterStatusDestinatarioClasse = (status: 'PENDENTE' | 'ENVIADO' | 'FALHA') =>
  DESTINATARIO_STATUS_CLASSES[status] || DESTINATARIO_STATUS_CLASSES.PENDENTE

const resumoConteudo = (html: string) => {
  if (!html) {
    return 'Sem conteúdo disponível.'
  }

  const texto = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return texto.length > 140 ? `${texto.slice(0, 140)}…` : texto
}

const formatarTipo = (tipo: string) => {
  if (!tipo) {
    return 'Não informado'
  }

  const mapa: Record<string, string> = {
    task_status_change: 'Status da tarefa',
    task_deadline_alert: 'Prazo de tarefa',
    surgery_deadline_alert: 'Prazo de cirurgia',
    weekly_dashboard: 'Resumo semanal',
  }

  return mapa[tipo] || tipo
}

const carregarNotificacoes = async () => {
  carregando.value = true
  erro.value = ''

  try {
    const resposta = await fetchNotificationQueue({
      status: statusFiltro.value,
      page: paginacao.value.page,
      pageSize: paginacao.value.pageSize,
    })

    notificacoes.value = resposta.items
    paginacao.value = resposta.pagination
  } catch (error: unknown) {
    console.error('[Fila de Notificações] Erro ao carregar dados', error)
    erro.value = 'Não foi possível carregar a fila de notificações.'
  } finally {
    carregando.value = false
  }
}

const alterarPagina = (pagina: number) => {
  if (pagina < 1 || pagina > totalPaginas.value) {
    return
  }

  paginacao.value.page = pagina
  carregarNotificacoes()
}

watch(statusFiltro, () => {
  paginacao.value.page = 1
  carregarNotificacoes()
})

onMounted(() => {
  carregarNotificacoes()
})
</script>
