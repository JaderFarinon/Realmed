<template>
  <div class="flex flex-wrap items-center justify-between gap-3 mb-6">
    <div class="flex items-center gap-2">
      <IconButton
        class="border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        title="Novo sorteio"
        aria-label="Novo sorteio"
        @click="$emit('novo')"
      >
        <NewIcon class="h-4 w-4" />
      </IconButton>

      <IconButton
        class="border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        :title="acaoTooltip"
        :aria-label="acaoTooltip"
        :disabled="acaoDisabled"
        @click="$emit('acao')"
      >
        <component :is="acaoIcon" class="h-4 w-4" />
      </IconButton>

      <slot name="actions" />
    </div>

    <nav>
      <ol class="flex items-center gap-1.5">
        <li>
          <router-link
            class="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400"
            to="/"
          >
            Home
            <svg
              class="stroke-current"
              width="17"
              height="16"
              viewBox="0 0 17 16"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6.0765 12.667L10.2432 8.50033L6.0765 4.33366"
                stroke=""
                stroke-width="1.2"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </router-link>
        </li>
        <li class="text-sm text-gray-800 dark:text-white/90">
          {{ pageTitle }}
        </li>
      </ol>
    </nav>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import { defineProps, defineEmits, withDefaults } from 'vue'
import IconButton from '@/components/ui/IconButton.vue'
import { NewIcon } from '@/icons'

interface Props {
  pageTitle: string
  acaoTooltip: string
  acaoDisabled?: boolean
  acaoIcon: Component
}

withDefaults(defineProps<Props>(), {
  acaoDisabled: false,
})

defineEmits(['novo', 'acao'])
</script>
