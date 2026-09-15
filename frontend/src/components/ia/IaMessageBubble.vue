<template>
  <div
    :class="[
      'flex w-full gap-3',
      role === 'assistant' ? 'justify-start' : 'justify-end',
    ]"
  >
    <div
      :class="[
        'max-w-3xl rounded-2xl px-4 py-3 text-sm shadow-theme-xs ring-1 transition',
        role === 'assistant'
          ? 'bg-gray-900 text-gray-100 ring-gray-800'
          : 'bg-brand-500 text-white ring-brand-500/70',
      ]"
    >
      <slot>
        <p class="whitespace-pre-wrap leading-relaxed">{{ content }}</p>
      </slot>
      <p class="mt-2 text-right text-[10px] uppercase tracking-wide opacity-60">
        {{ formattedDate }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IaRole } from '@/services/ia'

interface Props {
  role: IaRole
  content: string
  createdAt?: string
}

const props = withDefaults(defineProps<Props>(), {
  createdAt: '',
})

const formattedDate = computed(() => {
  if (!props.createdAt) {
    return ''
  }
  const parsed = new Date(props.createdAt)
  if (Number.isNaN(parsed.getTime())) {
    return props.createdAt
  }
  return parsed.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  })
})
</script>
