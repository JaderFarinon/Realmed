<template>
  <Teleport to="body">
    <Modal v-if="modelValue" :full-screen-backdrop="true" @close="close">
      <div class="flex w-full justify-center px-4 py-6">
        <div :class="containerClass" role="dialog" aria-modal="true">
          <header class="mb-4 flex items-start justify-between gap-3">
            <div class="flex flex-col">
              <h3 class="text-lg font-semibold text-gray-900 dark:text-gray-100">{{ title }}</h3>
              <p v-if="$slots.subtitle" class="text-sm text-gray-500 dark:text-gray-400">
                <slot name="subtitle" />
              </p>
            </div>
            <button
              type="button"
              class="rounded-md p-2 text-gray-400 transition hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800"
              @click="close"
            >
              <span class="sr-only">Fechar</span>
              ×
            </button>
          </header>

          <div class="overflow-y-auto">
            <slot />
          </div>
        </div>
      </div>
    </Modal>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, withDefaults } from 'vue'
import Modal from '@/components/ui/Modal.vue'

const props = withDefaults(
  defineProps<{
    modelValue: boolean
    title?: string
    large?: boolean
  }>(),
  {
    modelValue: false,
    large: false,
  },
)

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const close = () => emit('update:modelValue', false)

const containerClass = computed(() =>
  [
    'relative flex w-full flex-col rounded-2xl border border-gray-200 bg-white p-6 shadow-theme-xl dark:border-gray-700 dark:bg-gray-900',
    props.large ? 'max-w-4xl' : 'max-w-2xl',
  ],
)
</script>
