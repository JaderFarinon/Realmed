<template>
  <div
    class="flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-theme-xs dark:border-gray-800 dark:bg-white/[0.03]"
  >
    <div class="flex-1 min-h-0 max-w-full overflow-auto custom-scrollbar">
      <table class="min-w-full text-left">
        <thead class="bg-gray-50 dark:bg-white/[0.04]">
          <tr class="border-b border-gray-100 dark:border-gray-800/80">
            <th v-for="column in columns" :key="column.key" scope="col" class="px-5 py-3">
              <span class="font-medium uppercase tracking-wide text-theme-xs text-gray-500 dark:text-gray-400">
                {{ column.label }}
              </span>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800/80">
          <tr v-if="loading" class="border-t border-transparent">
            <td :colspan="columns.length" class="px-5 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
              Carregando notificações...
            </td>
          </tr>
          <tr
            v-else-if="items.length === 0"
            class="border-t border-transparent"
          >
            <td :colspan="columns.length" class="px-5 py-6 text-center text-theme-sm text-gray-500 dark:text-gray-400">
              Nenhuma notificação encontrada para o filtro selecionado.
            </td>
          </tr>
          <tr
            v-for="item in currentPageItems"
            v-else
            :key="item.id"
            :class="[
              'cursor-pointer border-t border-transparent transition-colors',
              selectedId === item.id
                ? 'bg-brand-50/60 text-gray-700 dark:bg-brand-500/10 dark:text-gray-200'
                : 'hover:bg-gray-50 dark:hover:bg-white/[0.04] text-gray-600 dark:text-gray-300',
            ]"
            @click="handleSelect(item)"
          >
            <td class="px-5 py-4 text-theme-sm">{{ item.id }}</td>
            <td class="px-5 py-4 text-theme-sm">
              <StatusBadge :status="item.preProcessamento?.dsClass ?? 'Não Processado'" />
            </td>
            <td class="px-5 py-4 text-theme-sm">
              <DiagramBadge :diagramas="item.diagramas" />
            </td>
            <td class="px-5 py-4 text-theme-sm">
              <PlanosBadge :pos-processamento="item.posProcessamento" />
            </td>
            <td class="px-5 py-4 text-theme-sm">
              <EficaciaBadge :pos-processamento="item.posProcessamento" />
            </td>
            <td class="px-5 py-4 text-theme-sm">
              <StatusResumoBadge :notificacao="item" />
            </td>
            <td class="px-5 py-4 text-theme-sm">
              {{ item.responsavel?.dsResp ?? 'Não definido' }}
            </td>
            <td class="px-5 py-4 text-theme-sm">{{ item.nmMedico ?? '—' }}</td>
            <td class="px-5 py-4 text-theme-sm">{{ item.dsSetor }}</td>
            <td class="px-5 py-4 text-theme-sm">{{ item.nmPaciente ?? '—' }}</td>
            <td class="px-5 py-4 text-theme-sm">{{ formatDate(item.dtIncidente) }}</td>
            <td class="px-5 py-4 text-theme-sm">{{ formatDate(item.dtCadastro) }}</td>
            <td class="px-5 py-4 text-theme-sm">
              <div class="flex justify-end gap-2">
                <IconButton
                  :class="[
                    'h-9 w-9 rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]',
                    item.preProcessamento?.dsClass && item.preProcessamento.dsClass !== 'Não Processado'
                      ? 'pointer-events-none opacity-40'
                      : '',
                  ]"
                  title="Pré-Processamento"
                  aria-label="Pré-Processamento"
                  @click.stop="emit('pre-processamento', item)"
                >
                  <SettingsIcon class="h-4 w-4" />
                </IconButton>
                <IconButton
                  class="h-9 w-9 rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  title="Visualizar"
                  aria-label="Visualizar"
                  @click.stop="emit('preview', item)"
                >
                  <EyeIcon class="h-4 w-4" />
                </IconButton>
                <IconButton
                  class="h-9 w-9 rounded-xl border border-gray-200 text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
                  title="Imprimir"
                  aria-label="Imprimir"
                  @click.stop="emit('imprimir', item)"
                >
                  <PrinterIcon class="h-4 w-4" />
                </IconButton>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div
      v-if="numPages > 1"
      class="flex flex-wrap items-center justify-between gap-4 border-t border-gray-100 px-5 py-4 text-theme-xs text-gray-500 dark:border-gray-800 dark:text-gray-400"
    >
      <div class="flex flex-wrap gap-2">
        <template v-for="page in visiblePages" :key="`${page}-${currentPage}`">
          <button
            v-if="page === 'prev' || page === 'next'"
            type="button"
            class="rounded-lg border border-gray-200 px-3 py-1 text-theme-xs text-gray-500 transition hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
            @click="goToPage(page)"
          >
            ...
          </button>
          <button
            v-else
            type="button"
            :class="[
              'rounded-lg border px-3 py-1 text-theme-xs transition',
              page === currentPage
                ? 'border-brand-500 bg-brand-500 text-white shadow-theme-xs'
                : 'border-gray-200 text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]',
            ]"
            @click="goToPage(page)"
          >
            {{ (page as number) + 1 }}
          </button>
        </template>
      </div>
      <div class="ml-auto flex gap-2">
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1 text-theme-xs text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          :disabled="currentPage === 0"
          @click="currentPage > 0 && (currentPage = currentPage - 1)"
        >
          Anterior
        </button>
        <button
          type="button"
          class="rounded-lg border border-gray-200 px-3 py-1 text-theme-xs text-gray-500 transition hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-white/[0.04]"
          :disabled="currentPage === numPages - 1"
          @click="currentPage < numPages - 1 && (currentPage = currentPage + 1)"
        >
          Próxima
        </button>
      </div>
      <div class="text-theme-xs text-gray-500 dark:text-gray-400">
        Página {{ currentPage + 1 }} de {{ numPages }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import IconButton from '@/components/ui/IconButton.vue'
import { EyeIcon, PrinterIcon } from 'lucide-vue-next'
import { SettingsIcon } from '@/icons'
import StatusBadge from '@/views/Qualidade/NotIncidentes/components/StatusBadge.vue'
import DiagramBadge from '@/views/Qualidade/NotIncidentes/components/DiagramBadge.vue'
import PlanosBadge from '@/views/Qualidade/NotIncidentes/components/PlanosBadge.vue'
import EficaciaBadge from '@/views/Qualidade/NotIncidentes/components/EficaciaBadge.vue'
import StatusResumoBadge from '@/views/Qualidade/NotIncidentes/components/StatusResumoBadge.vue'
import type { NotificacaoIncidente } from '@/types/notIncidentes'

const props = withDefaults(
  defineProps<{
    items: NotificacaoIncidente[]
    loading?: boolean
    selectedId?: number | null
    pageSize?: number
  }>(),
  {
    loading: false,
    selectedId: null,
    pageSize: 10,
  }
)

const emit = defineEmits<{
  (e: 'update:selectedId', value: number | null): void
  (e: 'pre-processamento', value: NotificacaoIncidente): void
  (e: 'preview', value: NotificacaoIncidente): void
  (e: 'imprimir', value: NotificacaoIncidente): void
}>()

const currentPage = ref(0)

const columns = [
  { key: 'id', label: '#' },
  { key: 'classificacao', label: 'Classificação' },
  { key: 'diagramas', label: 'Diagramas' },
  { key: 'plano', label: 'Plano de Ação' },
  { key: 'eficacia', label: 'Avaliação de Eficácia' },
  { key: 'status', label: 'Status' },
  { key: 'responsavel', label: 'Responsável' },
  { key: 'profissional', label: 'Profissional' },
  { key: 'setor', label: 'Setor' },
  { key: 'paciente', label: 'Paciente' },
  { key: 'notificado', label: 'Notificado em' },
  { key: 'cadastrado', label: 'Cadastrado em' },
  { key: 'acoes', label: 'Ações' },
] as const

const perPage = computed(() => Number(props.pageSize) || 10)

const MAX_VISIBLE_PAGES = 8

const numPages = computed(() => {
  const total = Math.ceil(props.items.length / perPage.value)
  return total > 0 ? total : 1
})

const currentPageItems = computed(() => {
  const start = currentPage.value * perPage.value
  return props.items.slice(start, start + perPage.value)
})

const visiblePages = computed(() => {
  const total = numPages.value
  const current = currentPage.value

  if (total <= MAX_VISIBLE_PAGES) {
    return Array.from({ length: total }, (_, index) => index)
  }

  if (current <= 3) {
    return [...Array.from({ length: MAX_VISIBLE_PAGES }, (_, index) => index), 'next']
  }

  if (current >= total - 4) {
    return ['prev', ...Array.from({ length: MAX_VISIBLE_PAGES }, (_, index) => total - MAX_VISIBLE_PAGES + index)]
  }

  return ['prev', ...Array.from({ length: MAX_VISIBLE_PAGES - 2 }, (_, index) => current - 3 + index), 'next']
})

const goToPage = (page: number | string) => {
  if (page === 'prev') {
    currentPage.value = Math.max(currentPage.value - (MAX_VISIBLE_PAGES - 2), 0)
  } else if (page === 'next') {
    currentPage.value = Math.min(currentPage.value + (MAX_VISIBLE_PAGES - 2), numPages.value - 1)
  } else {
    currentPage.value = page as number
  }
}

const handleSelect = (item: NotificacaoIncidente) => {
  const value = props.selectedId === item.id ? null : item.id
  emit('update:selectedId', value)
}

const formatDate = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(date)
}

watch(
  () => props.items.length,
  () => {
    const lastPage = Math.max(Math.ceil(props.items.length / perPage.value) - 1, 0)
    if (currentPage.value > lastPage) {
      currentPage.value = lastPage
    }
  }
)

watch(
  () => props.pageSize,
  () => {
    const lastPage = Math.max(Math.ceil(props.items.length / perPage.value) - 1, 0)
    if (currentPage.value > lastPage) {
      currentPage.value = lastPage
    }
  }
)
</script>
