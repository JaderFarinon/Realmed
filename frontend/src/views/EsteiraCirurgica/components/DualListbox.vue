<template>
  <div class="space-y-4">
    <header class="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h3 class="text-base font-semibold text-gray-800 dark:text-gray-100">{{ title }}</h3>
        <p v-if="subtitle" class="text-sm text-gray-500 dark:text-gray-400">{{ subtitle }}</p>
      </div>
      <slot name="actions" />
    </header>

    <div class="grid gap-4 md:grid-cols-[1fr_auto_1fr] md:items-center">
      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-600 dark:text-gray-300">{{ leftLabel }}</h4>
        <div class="h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <template v-if="loading">
            <div class="flex h-full items-center justify-center px-4 text-sm text-gray-500 dark:text-gray-400">
              Carregando...
            </div>
          </template>
          <template v-else>
            <ul
              v-if="availableItems.length"
              class="flex h-full flex-col divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
            >
              <li
                v-for="item in availableItems"
                :key="`available-${item.id}`"
                :class="[
                  'cursor-pointer px-4 py-3 text-sm transition',
                  selectedAvailableIdsSet.has(item.id)
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-200'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/70',
                ]"
                @click="toggleAvailable(item.id)"
                @dblclick.prevent="adicionar([item.id])"
              >
                <p class="font-medium">{{ item.label }}</p>
                <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.description }}
                </p>
              </li>
            </ul>
            <div
              v-else
              class="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              Nenhum usuário disponível
            </div>
          </template>
        </div>
      </div>

      <div class="flex flex-col items-center gap-2">
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          :disabled="isDisabled || !selectedAvailableIdsSet.size"
          @click="adicionar(Array.from(selectedAvailableIdsSet))"
          aria-label="Adicionar selecionados"
        >
          &gt;
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          :disabled="isDisabled || !selectedAssignedIdsSet.size"
          @click="remover(Array.from(selectedAssignedIdsSet))"
          aria-label="Remover selecionados"
        >
          &lt;
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          :disabled="isDisabled || !availableItems.length"
          @click="adicionar(availableItems.map((item) => item.id))"
          aria-label="Adicionar todos"
        >
          &gt;&gt;
        </button>
        <button
          type="button"
          class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-600 transition hover:border-brand-300 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:border-brand-400 dark:hover:text-brand-200"
          :disabled="isDisabled || !assignedItems.length"
          @click="remover(assignedItems.map((item) => item.id))"
          aria-label="Remover todos"
        >
          &lt;&lt;
        </button>
        <button
          v-if="mostrarExtraAcao"
          type="button"
          class="inline-flex h-9 items-center justify-center gap-2 rounded-full border border-transparent bg-rose-600 px-3 text-xs font-semibold uppercase tracking-wide text-white transition hover:bg-rose-700 focus:outline-hidden focus:ring-2 focus:ring-rose-500/60 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="isExtraAcaoDesabilitada"
          @click="emitirExtraAcao"
        >
          {{ extraActionLabel }}
        </button>
      </div>

      <div class="space-y-2">
        <h4 class="text-sm font-semibold text-gray-600 dark:text-gray-300">{{ rightLabel }}</h4>
        <div class="h-64 overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <template v-if="loading">
            <div class="flex h-full items-center justify-center px-4 text-sm text-gray-500 dark:text-gray-400">
              Carregando...
            </div>
          </template>
          <template v-else>
            <ul
              v-if="assignedItems.length"
              class="flex h-full flex-col divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800"
            >
              <li
                v-for="item in assignedItems"
                :key="`assigned-${item.id}`"
                :class="[
                  'cursor-pointer px-4 py-3 text-sm transition',
                  selectedAssignedIdsSet.has(item.id)
                    ? 'bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-200'
                    : highlightedIdsSet.has(item.id)
                    ? 'border-l-4 border-rose-400 bg-rose-50/70 text-rose-700 dark:border-rose-500 dark:bg-rose-500/10 dark:text-rose-200'
                    : 'text-gray-700 hover:bg-gray-50 dark:text-gray-200 dark:hover:bg-gray-800/70',
                ]"
                @click="toggleAssigned(item.id)"
                @dblclick.prevent="remover([item.id])"
              >
                <div class="flex items-start justify-between gap-2">
                  <p class="font-medium">{{ item.label }}</p>
                  <span
                    v-if="highlightedIdsSet.has(item.id) && highlightedLabel"
                    class="whitespace-nowrap rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-rose-700 dark:bg-rose-500/20 dark:text-rose-200"
                  >
                    {{ highlightedLabel }}
                  </span>
                </div>
                <p v-if="item.description" class="text-xs text-gray-500 dark:text-gray-400">
                  {{ item.description }}
                </p>
              </li>
            </ul>
            <div
              v-else
              class="flex h-full items-center justify-center px-4 text-center text-sm text-gray-500 dark:text-gray-400"
            >
              Nenhum usuário selecionado
            </div>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

export interface DualListItem {
  id: number
  label: string
  description?: string | null
}

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    items: DualListItem[]
    modelValue: number[]
    leftLabel?: string
    rightLabel?: string
    disabled?: boolean
    loading?: boolean
    showExtraAction?: boolean
    extraActionLabel?: string
    extraActionDisabled?: boolean
    highlightedIds?: number[]
    highlightedLabel?: string
  }>(),
  {
    subtitle: undefined,
    leftLabel: 'Disponíveis',
    rightLabel: 'Selecionados',
    disabled: false,
    loading: false,
    showExtraAction: false,
    extraActionLabel: 'Destacar',
    extraActionDisabled: false,
    highlightedIds: () => [],
    highlightedLabel: '',
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: number[]): void
  (e: 'extra-action', value: number[]): void
}>()

const selectedAvailableIds = ref<number[]>([])
const selectedAssignedIds = ref<number[]>([])

const isDisabled = computed(() => props.disabled || props.loading)

const mostrarExtraAcao = computed(() => props.showExtraAction)

const itemsMap = computed(() => {
  const map = new Map<number, DualListItem>()
  props.items.forEach((item) => {
    map.set(item.id, item)
  })
  return map
})

const selectedAvailableIdsSet = computed(() => new Set(selectedAvailableIds.value))
const selectedAssignedIdsSet = computed(() => new Set(selectedAssignedIds.value))
const highlightedIdsSet = computed(() => new Set(props.highlightedIds))

const assignedItems = computed(() => {
  return props.modelValue
    .map((id) => itemsMap.value.get(id))
    .filter((item): item is DualListItem => Boolean(item))
})

const assignedIdSet = computed(() => new Set(props.modelValue))

const availableItems = computed(() => {
  return props.items
    .filter((item) => !assignedIdSet.value.has(item.id))
    .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))
})

watch(
  () => props.modelValue,
  () => {
    selectedAssignedIds.value = selectedAssignedIds.value.filter((id) => assignedIdSet.value.has(id))
  },
)

watch(
  () => props.items,
  () => {
    const existingIds = new Set(props.items.map((item) => item.id))
    selectedAvailableIds.value = selectedAvailableIds.value.filter((id) => existingIds.has(id) && !assignedIdSet.value.has(id))
    selectedAssignedIds.value = selectedAssignedIds.value.filter((id) => existingIds.has(id) && assignedIdSet.value.has(id))
  },
)

const toggleAvailable = (id: number) => {
  if (isDisabled.value) {
    return
  }

  const set = new Set(selectedAvailableIds.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  selectedAvailableIds.value = Array.from(set)
}

const toggleAssigned = (id: number) => {
  if (isDisabled.value) {
    return
  }

  const set = new Set(selectedAssignedIds.value)
  if (set.has(id)) {
    set.delete(id)
  } else {
    set.add(id)
  }
  selectedAssignedIds.value = Array.from(set)
}

const adicionar = (ids: number[]) => {
  if (!ids.length || isDisabled.value) {
    return
  }

  const novoValor = Array.from(new Set([...props.modelValue, ...ids]))
  emit('update:modelValue', novoValor)
  selectedAvailableIds.value = []
}

const remover = (ids: number[]) => {
  if (!ids.length || isDisabled.value) {
    return
  }

  const conjunto = new Set(ids)
  const novoValor = props.modelValue.filter((id) => !conjunto.has(id))
  emit('update:modelValue', novoValor)
  selectedAssignedIds.value = []
}

const isExtraAcaoDesabilitada = computed(() => {
  if (!mostrarExtraAcao.value) {
    return true
  }

  return (
    isDisabled.value ||
    props.extraActionDisabled ||
    !selectedAssignedIdsSet.value ||
    selectedAssignedIdsSet.value.size === 0
  )
})

const emitirExtraAcao = () => {
  if (isExtraAcaoDesabilitada.value) {
    return
  }

  emit('extra-action', Array.from(selectedAssignedIdsSet.value))
}
</script>
