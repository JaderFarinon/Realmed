<template>
  <aside
    class="flex h-full w-full flex-col gap-4 rounded-2xl bg-white/70 p-4 shadow-theme-sm ring-1 ring-gray-200 backdrop-blur dark:bg-gray-900/70 dark:ring-gray-800 md:w-72"
  >
    <header class="flex items-center justify-between">
      <h2 class="text-sm font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
        Conversas
      </h2>
      <button
        type="button"
        class="flex items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-medium text-white transition hover:bg-brand-600"
        @click="$emit('novo-chat')"
      >
        <PlusIcon class="h-4 w-4" />
        Novo Chat
      </button>
    </header>

    <div class="flex-1 overflow-y-auto pr-1">
      <ul class="flex flex-col gap-2">
        <li v-if="!chatsList.length && !isLoading" class="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          Nenhuma conversa encontrada. Crie um novo chat para começar.
        </li>
        <li v-else-if="isLoading" class="rounded-xl border border-dashed border-gray-200 px-3 py-6 text-center text-xs text-gray-400 dark:border-gray-700 dark:text-gray-500">
          Carregando conversas...
        </li>
        <li v-for="chat in chatsList" :key="chat.id">
          <button
            type="button"
            :class="[
              'w-full rounded-xl border px-3 py-3 text-left text-sm font-medium transition',
              chat.id === selectedId
                ? 'border-brand-500 bg-brand-500/10 text-brand-700 dark:border-brand-500 dark:text-brand-200'
                : 'border-transparent bg-white text-gray-600 hover:border-brand-200 hover:bg-brand-50/60 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-brand-500/40 dark:hover:text-white/90',
            ]"
            @click="$emit('update:modelValue', chat.id)"
          >
            <p class="truncate">
              {{ chat.title }}
            </p>
            <p class="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {{ formatDate(chat.created_at) }}
            </p>
          </button>
        </li>
      </ul>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { PlusIcon } from '@/icons'
import type { IaChat } from '@/services/ia'

interface Props {
  chats: IaChat[]
  modelValue: number | null
  loading?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  chats: () => [],
  modelValue: null,
  loading: false,
})

defineEmits(['update:modelValue', 'novo-chat'])

const chatsList = computed(() => props.chats)
const selectedId = computed(() => props.modelValue)
const isLoading = computed(() => props.loading)

const formatDate = (value: string) => {
  if (!value) {
    return ''
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}
</script>
